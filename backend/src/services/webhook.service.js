const crypto = require("crypto")
const webhookModel = require("../models/webhook.model")

/**
 * Dispatches a signed webhook payload to all matching active third-party endpoints.
 * Operates asynchronously in a non-blocking fire-and-forget manner with strict timeout safeguards.
 * 
 * @param {string|import('mongoose').Types.ObjectId} userId - Webhook subscriber User ID
 * @param {string} eventName - Name of the triggered event (e.g., 'transaction.success')
 * @param {object} payloadData - Event data dictionary to transmit
 */
function sendWebhook(userId, eventName, payloadData) {
    // Non-blocking asynchronous dispatch
    setImmediate(async () => {
        try {
            if (!userId || !eventName) return

            // Query active webhook subscriptions for this user that listen to this event
            const subscriptions = await webhookModel.find({
                userId,
                isActive: true,
                events: eventName
            })

            if (!subscriptions || subscriptions.length === 0) {
                return
            }

            const timestamp = Math.floor(Date.now() / 1000)
            const eventPayload = {
                id: "evt_" + crypto.randomBytes(12).toString("hex"),
                event: eventName,
                timestamp,
                data: payloadData
            }

            const payloadString = JSON.stringify(eventPayload)

            // Send webhook to each subscribed endpoint
            const dispatchPromises = subscriptions.map(async (webhook) => {
                try {
                    // Generate HMAC SHA-256 signature using the subscriber's secretKey
                    const signature = crypto
                        .createHmac("sha256", webhook.secretKey)
                        .update(payloadString)
                        .digest("hex")

                    // 5-second timeout guard to prevent hanging connections
                    const response = await fetch(webhook.targetUrl, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-Signature": signature,
                            "X-Webhook-Event": eventName,
                            "X-Webhook-Timestamp": timestamp.toString(),
                            "User-Agent": "NovaLedger-Webhooks/1.0"
                        },
                        body: payloadString,
                        signal: AbortSignal.timeout(5000)
                    })

                    if (!response.ok) {
                        console.warn(
                            `[Webhook Warning] Endpoint ${webhook.targetUrl} responded with HTTP status ${response.status}`
                        )
                    }
                } catch (err) {
                    // Third-party network failure or timeout; log warning without throwing
                    console.error(
                        `[Webhook Error] Failed dispatch to ${webhook.targetUrl}: ${err.message}`
                    )
                }
            })

            await Promise.allSettled(dispatchPromises)
        } catch (error) {
            console.error("[Webhook Service Error]:", error.message)
        }
    })
}

module.exports = {
    sendWebhook
}
