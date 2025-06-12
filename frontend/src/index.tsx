import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './App.module.css'; // ← ここでTailwindを読み込む
import App from './App';
import reportWebVitals from './reportWebVitals';
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

// Stripe 公開キーを.envから取得
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY!);
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <Elements stripe={stripePromise}>
    <App />
    </Elements>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
