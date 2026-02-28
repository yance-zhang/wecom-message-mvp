export default function Home() {
  return (
    <main
      style={{
        maxWidth: "800px",
        margin: "50px auto",
        padding: "20px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <h1>企业微信回调处理 - MVP</h1>

      <div
        style={{
          marginTop: "30px",
          padding: "20px",
          backgroundColor: "#f5f5f5",
          borderRadius: "8px",
        }}
      >
        <h2>✅ 服务运行中</h2>
        <p>回调API已准备好接收企业微信消息。</p>
      </div>

      <div style={{ marginTop: "30px" }}>
        <h3>API 端点</h3>
        <ul>
          <li>
            <code>GET /api/callback</code> - 验证回调URL
          </li>
          <li>
            <code>POST /api/callback</code> - 接收企业微信消息
          </li>
        </ul>
      </div>

      <div
        style={{
          marginTop: "30px",
          padding: "20px",
          backgroundColor: "#fffacd",
          borderRadius: "8px",
        }}
      >
        <h3>⚙️ 配置企业微信</h3>
        <p>在企业微信应用设置中，配置回调URL：</p>
        <code
          style={{
            display: "block",
            padding: "10px",
            backgroundColor: "#fff",
            marginTop: "10px",
          }}
        >
          https://your-domain.com/api/callback
        </code>
      </div>

      <div style={{ marginTop: "30px" }}>
        <h3>📋 环境变量</h3>
        <p>确保已配置以下环境变量（在 .env.local 中）：</p>
        <ul>
          <li>
            <code>NEXT_PUBLIC_WECOM_TOKEN</code>
          </li>
          <li>
            <code>NEXT_PUBLIC_WECOM_ENCODING_AES_KEY</code>
          </li>
          <li>
            <code>NEXT_PUBLIC_WECOM_CORP_ID</code>
          </li>
        </ul>
        <p>
          查看 <code>.env.local.example</code> 了解详情。
        </p>
      </div>

      <div style={{ marginTop: "30px", fontSize: "12px", color: "#666" }}>
        <p>
          📚 更多信息请查看 <code>README.md</code>
        </p>
      </div>
    </main>
  );
}
