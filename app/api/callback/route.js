import crypto from "crypto";
import { getRawBody } from "raw-body";

// 获取企业微信配置
const TOKEN = process.env.WECOM_TOKEN;
const ENCODING_AES_KEY = process.env.WECOM_ENCODING_AES_KEY;
const CORP_ID = process.env.WECOM_CORP_ID;

if (!TOKEN || !ENCODING_AES_KEY) {
  throw new Error(
    "Missing required environment variables: WECOM_TOKEN or WECOM_ENCODING_AES_KEY",
  );
}

/**
 * 计算签名
 */
function calculateSignature(token, timestamp, nonce, echostr) {
  const str = [token, timestamp, nonce, echostr].sort().join("");
  return crypto.createHash("sha1").update(str).digest("hex");
}

/**
 * 对消息进行AES解密
 */
function decryptMessage(encryptedMsg, encodingAesKey) {
  try {
    const key = Buffer.from(encodingAesKey + "=", "base64");
    const iv = key.slice(0, 16);

    const encrypted = Buffer.from(encryptedMsg, "base64");
    const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv);

    let decrypted = decipher.update(encrypted, "binary", "utf8");
    decrypted += decipher.final("utf8");

    // 移除填充的字节
    const content = decrypted.slice(16);
    const len = Buffer.from(content.slice(-4), "binary").readUInt32BE(0);

    return content.slice(0, len);
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Failed to decrypt message");
  }
}

/**
 * 对消息进行AES加密
 */
function encryptMessage(msg, encodingAesKey) {
  try {
    const key = Buffer.from(encodingAesKey + "=", "base64");
    const iv = key.slice(0, 16);

    // 生成随机字符串
    const randomStr = crypto.randomBytes(8).toString("hex");

    // 构建待加密内容：randomStr(16bytes) + msgLen(4bytes) + msg + corpId
    const msgLen = Buffer.alloc(4);
    msgLen.writeUInt32BE(msg.length);

    const content = Buffer.concat([
      Buffer.from(randomStr, "utf8"),
      msgLen,
      Buffer.from(msg, "utf8"),
      Buffer.from(CORP_ID || "", "utf8"),
    ]);

    // PKCS7填充
    const blockSize = 16;
    const paddingLen = blockSize - (content.length % blockSize);
    const padding = Buffer.alloc(paddingLen, paddingLen);
    const padded = Buffer.concat([content, padding]);

    // 加密
    const cipher = crypto.createCipheriv("aes-128-cbc", key, iv);
    let encrypted = cipher.update(padded, "binary", "base64");
    encrypted += cipher.final("base64");

    return encrypted;
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt message");
  }
}

/**
 * 处理GET请求 - 验证回调URL
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const msgSignature = searchParams.get("msg_signature");
    const timestamp = searchParams.get("timestamp");
    const nonce = searchParams.get("nonce");
    const echostr = searchParams.get("echostr");

    if (!msgSignature || !timestamp || !nonce || !echostr) {
      return new Response("Missing parameters", { status: 400 });
    }

    // 验证签名
    const signature = calculateSignature(TOKEN, timestamp, nonce, echostr);

    if (signature !== msgSignature) {
      console.error("Signature verification failed");
      return new Response("Invalid signature", { status: 403 });
    }

    // 解密echostr
    const decrypted = decryptMessage(echostr, ENCODING_AES_KEY);

    console.info("Callback URL verified successfully");
    return new Response(decrypted);
  } catch (error) {
    console.error("GET error:", error);
    return new Response("Verification failed", { status: 500 });
  }
}

/**
 * 处理POST请求 - 接收企业微信消息
 */
export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const msgSignature = searchParams.get("msg_signature");
    const timestamp = searchParams.get("timestamp");
    const nonce = searchParams.get("nonce");

    if (!msgSignature || !timestamp || !nonce) {
      return new Response("Missing parameters", { status: 400 });
    }

    // 获取请求体
    const body = await request.text();

    // 验证签名
    const signature = calculateSignature(TOKEN, timestamp, nonce, body);

    if (signature !== msgSignature) {
      console.error("Signature verification failed for POST");
      return new Response("Invalid signature", { status: 403 });
    }

    // 解析XML并提取加密内容
    const encryptedMatchResult = body.match(
      /<Encrypt><!\[CDATA\[(.*?)\]\]><\/Encrypt>/,
    );
    if (!encryptedMatchResult) {
      console.error("No encrypted content found");
      return new Response("Invalid message format", { status: 400 });
    }

    const encryptedMsg = encryptedMatchResult[1];
    const decrypted = decryptMessage(encryptedMsg, ENCODING_AES_KEY);

    console.info("Message received and decrypted:", decrypted);

    // 这里可以处理消息逻辑，例如调用AI、保存数据库等
    // TODO: Add your message processing logic here

    // 构建回复消息
    const replyMsg = `收到消息: ${decrypted}`;
    const encrypted = encryptMessage(replyMsg, ENCODING_AES_KEY);

    // 计算回复的签名
    const replySignature = calculateSignature(
      TOKEN,
      timestamp,
      nonce,
      encrypted,
    );

    // 返回加密的XML响应
    const xmlResponse = `
      <xml>
        <Encrypt><![CDATA[${encrypted}]]></Encrypt>
        <MsgSignature><![CDATA[${replySignature}]]></MsgSignature>
        <TimeStamp>${timestamp}</TimeStamp>
        <Nonce><![CDATA[${nonce}]]></Nonce>
      </xml>
    `.trim();

    return new Response(xmlResponse, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("POST error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
