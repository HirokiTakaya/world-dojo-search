// src/components/CheckoutForm.tsx
import React, { FormEvent, useState } from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useTranslation } from "react-i18next";
import api from "../utils/axiosInstance";

const FREE_THROTTLE_DAYS = 3; // 例として

export default function CheckoutForm() {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();
  const [name, setName] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setErrorMsg(null);

    // カード情報から PaymentMethod を作成
    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: "card",
      card: elements.getElement(CardElement)!,
      billing_details: { name },
    });

    if (error) {
      // t('cardError', 'カード情報エラー')
      setErrorMsg(t("cardError"));
      setLoading(false);
      return;
    }

    try {
      const res = await api.post("stripe/create-subscription-with-elements/", {
        payment_method: paymentMethod.id,
        plan: "monthly",
      });
      const { client_secret, status } = res.data;

      if (status === "requires_action") {
        const { error: confirmError } =
          await stripe.confirmCardPayment(client_secret);
        if (confirmError) throw confirmError;
      }

      // t('subscriptionCreationSuccess', 'Premium サブスクリプション作成完了！')
      alert(t("subscriptionCreationSuccess"));
    } catch (err: any) {
      // t('subscriptionCreationFailed', 'サブスク作成に失敗しました')
      setErrorMsg(t("subscriptionCreationFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 200,
        width: "100%",
        maxWidth: 400,
        padding: 16,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: "#fff",
          padding: "24px",
          borderRadius: 8,
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {/* カード名義ラベル */}
        {/* translation key: cardholderNameLabel */}
        <label htmlFor="cardholder-name">
          {t("cardholderNameLabel")}
        </label>

        {/* カード名義入力欄 */}
        {/* translation key: cardholderNamePlaceholder */}
        <input
          id="cardholder-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("cardholderNamePlaceholder")}
          style={{
            width: "100%",
            padding: "8px",
            borderRadius: 4,
            border: "1px solid #ccc",
            fontSize: 16,
          }}
        />

        <CardElement
          options={{ style: { base: { fontSize: "16px" } } }}
        />

        {errorMsg && <p style={{ color: "red" }}>{errorMsg}</p>}

        <button
          type="submit"
          disabled={!stripe || loading}
          style={{
            marginTop: 8,
            padding: "12px 0",
            border: "none",
            borderRadius: 4,
            background: "#1976d2",
            color: "#fff",
            fontSize: 16,
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          {loading
            ? t("processing")           /* translation key: processing */
            : t("subscribeButton")      /* translation key: subscribeButton */ }
        </button>
      </form>
    </div>
  );
}
