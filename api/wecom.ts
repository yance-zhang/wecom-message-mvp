import getRawBody from "raw-body";

export default async function handler(req, res) {
  if (req.method === "GET") {
    // 企业微信验证URL时会调用
    res.status(200).send(req.query.echostr || "ok");
    return;
  }

  if (req.method === "POST") {
    const xml = await getRawBody(req);

    // 简单解析文本内容（MVP）
    const content = xml.toString();

    // 等待3秒
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 返回固定消息
    const reply = `
      <xml>
        <ToUserName><![CDATA[toUser]]></ToUserName>
        <FromUserName><![CDATA[fromUser]]></FromUserName>
        <CreateTime>${Date.now()}</CreateTime>
        <MsgType><![CDATA[text]]></MsgType>
        <Content><![CDATA[收到：${content}]]></Content>
      </xml>
    `;

    res.setHeader("Content-Type", "application/xml");
    res.status(200).send(reply);
  }
}
