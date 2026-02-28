import { createRequire } from "module";

const require = createRequire(import.meta.url);
const wecomCrypto = require("@wecom/crypto");

// 获取企业微信配置
const TOKEN = process.env.WECOM_TOKEN;
const ENCODING_AES_KEY = process.env.WECOM_ENCODING_AES_KEY;
const CORP_ID = process.env.WECOM_CORP_ID;

if (!TOKEN || !ENCODING_AES_KEY) {
  throw new Error(
    "Missing required environment variables: WECOM_TOKEN or WECOM_ENCODING_AES_KEY",
  );
}

function calculateSignature(token, timestamp, nonce, value) {
  return wecomCrypto.getSignature(token, timestamp, nonce, value);
}

function decryptMessage(encryptedMsg, encodingAesKey) {
  return wecomCrypto.decrypt(encodingAesKey, encryptedMsg);
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
    const msgSignature =
      searchParams.get("msg_signature") || searchParams.get("signature");
    const timestamp = searchParams.get("timestamp");
    const nonce = searchParams.get("nonce");
    const echostr = searchParams.get("echostr");

    if (!msgSignature || !timestamp || !nonce || !echostr) {
      return new Response("Missing parameters", { status: 400 });
    }

    const signature = calculateSignature(TOKEN, timestamp, nonce, echostr);

    if (signature !== msgSignature) {
      console.error("Signature verification failed", {
        timestamp,
        nonce,
        msgSignature,
      });
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
    const msgSignature =
      searchParams.get("msg_signature") || searchParams.get("signature");
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

    const signature = calculateSignature(TOKEN, timestamp, nonce, encryptedMsg);

    if (signature !== msgSignature) {
      console.error("Signature verification failed for POST");
      return new Response("Invalid signature", { status: 403 });
    }

    const { message: decrypted, id } = decryptMessage(
      encryptedMsg,
      ENCODING_AES_KEY,
    );

    if (CORP_ID && id && id !== CORP_ID) {
      console.error("ReceiveId mismatch:", id);
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
