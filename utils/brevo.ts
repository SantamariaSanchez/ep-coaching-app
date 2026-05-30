export async function sendBrevoEmail({
  to,
  subject,
  htmlContent,
}: {
  to: string
  subject: string
  htmlContent: string
}): Promise<boolean> {
  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.BREVO_API_KEY!,
      },
      body: JSON.stringify({
        sender: { name: "EP Coaching", email: "peccoux.manu@gmail.com" },
        to: [{ email: to }],
        subject,
        htmlContent,
      }),
    })
    return response.ok
  } catch {
    return false
  }
}
