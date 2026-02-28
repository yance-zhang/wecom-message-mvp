import crypto from "crypto";

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
 * 去除PKCS7填充
 */
function removePkcs7Padding(buffer) {
  const pad = buffer[buffer.length - 1];
  if (pad < 1 || pad > 32) {
    return buffer;
  }
  return buffer.slice(0, buffer.length - pad);
}

/**
 * 对消息进行AES解密
 */
function decryptMessage(encryptedMsg, encodingAesKey) {
  try {
    const key = Buffer.from(encodingAesKey + "=", "base64");
    const iv = key.slice(0, 16);

    const encrypted = Buffer.from(encryptedMsg, "base64");
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    decipher.setAutoPadding(false);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    const content = removePkcs7Padding(decrypted);

    const msgLength = content.slice(16, 20).readUInt32BE(0);
    const msgStart = 20;
    const msgEnd = msgStart + msgLength;
    const message = content.slice(msgStart, msgEnd).toString("utf8");
    const receiveId = content.slice(msgEnd).toString("utf8");

    return { message, receiveId };
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
    const msgBuffer = Buffer.from(msg, "utf8");
    const msgLen = Buffer.alloc(4);
    msgLen.writeUInt32BE(msgBuffer.length);

    const content = Buffer.concat([
      Buffer.from(randomStr, "utf8"),
      msgLen,
      msgBuffer,
      Buffer.from(CORP_ID || "", "utf8"),
    ]);

    // PKCS7填充
    const blockSize = 32;
    const paddingLen = blockSize - (content.length % blockSize || blockSize);
    const padding = Buffer.alloc(paddingLen, paddingLen);
    const padded = Buffer.concat([content, padding]);

    // 加密
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    cipher.setAutoPadding(false);
    const encrypted = Buffer.concat([cipher.update(padded), cipher.final()]);

    return encrypted.toString("base64");
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt message");
  }
}

function extractEncryptFromXml(xml) {
  const match = xml.match(/<Encrypt><!\[CDATA\[(.*?)\]\]><\/Encrypt>/s);
  return match?.[1] || null;
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
    const { message: decrypted } = decryptMessage(echostr, ENCODING_AES_KEY);

    console.info("Callback URL verified successfully");
    return new Response(decrypted, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
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

    const body = await request.text();

    const encryptedMsg = extractEncryptFromXml(body);
    if (!encryptedMsg) {
      console.error("No encrypted content found");
      return new Response("Invalid message format", { status: 400 });
    }

    // 企业微信POST签名校验使用加密字段Encrypt
    const signature = calculateSignature(TOKEN, timestamp, nonce, encryptedMsg);

    if (signature !== msgSignature) {
      console.error("Signature verification failed for POST");
      return new Response("Invalid signature", { status: 403 });
    }

    const { message: decrypted, receiveId } = decryptMessage(
      encryptedMsg,
      ENCODING_AES_KEY,
    );

    if (CORP_ID && receiveId !== CORP_ID) {
      console.error("ReceiveId mismatch:", receiveId);
      return new Response("Invalid corp id", { status: 403 });
    }

    console.info("Message received and decrypted:", decrypted);

    // 这里可以处理消息逻辑，例如调用AI、保存数据库等
    // TODO: Add your message processing logic here

    // 回调场景下可直接回 success，避免因回复加密格式导致企业微信判未响应
    return new Response("success", {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("POST error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
