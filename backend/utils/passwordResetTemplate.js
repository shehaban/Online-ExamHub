const passwordResetTemplate = (
  userName,

  verificationCode
) => {
  return `

  <div style="

    background:#f5f7fb;

    padding:40px;

    font-family:Arial,sans-serif;

  ">

    <div style="

      max-width:600px;

      margin:auto;

      background:white;

      border-radius:20px;

      overflow:hidden;

      box-shadow:0 4px 20px rgba(0,0,0,0.08);

    ">

      <div style="

        background:#111827;

        padding:25px;

        text-align:center;

      ">

        <img

          src="https://i.ibb.co/PvZL1NZW/exam-Hubimg.jpg"

          alt="ExamHub"

          width="70"

          style="display:block; margin:auto;"

        />

      </div>

      <div style="

        padding:40px;

      ">

        <h2 style="

          text-align:center;

          color:#111827;

          margin-top:0;

          margin-bottom:30px;

        ">

          Password Reset Request

        </h2>

        <p style="

          font-size:16px;

          color:#374151;

        ">

          Hello <b>${userName}</b>,

        </p>

        <p style="

          font-size:16px;

          color:#6b7280;

          line-height:1.7;

        ">

          We received a request to reset your password.

        </p>

        <p style="

          font-size:16px;

          color:#6b7280;

        ">

          Use the verification code below:

        </p>

        <div style="

  background:#2563eb;

  color:white;

  font-size:28px;

  font-weight:bold;

  text-align:center;

  padding:16px;

  border-radius:12px;

  letter-spacing:4px;

  margin:25px auto;

min-width:180px;;
">

  ${verificationCode}

</div>

        <p style="

          color:#ef4444;

          font-size:14px;

        ">

          ⚠️ Do not share this code with anyone.

        </p>

        <hr style="

          margin:35px 0;

          border:none;

          border-top:1px solid #e5e7eb;

        ">

        <p style="

          text-align:center;

          color:#9ca3af;

          font-size:14px;

        ">

          © ExamHub Team

        </p>

      </div>

    </div>

  </div>

  `
}

export default passwordResetTemplate
