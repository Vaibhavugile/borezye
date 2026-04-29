import React from "react";
import "./policy.css";

export default function PrivacyPolicy() {
  return (
    <div className="page-container">
      <h1>Privacy Policy</h1>

      <p>
        Borezy respects your privacy and is committed to protecting your
        personal information. This policy explains how data is collected
        and used in the Borezy application.
      </p>

      <h2>Information We Collect</h2>

      <ul>
        <li>Name and email address for login</li>
        <li>Customer booking information</li>
        <li>Location data for attendance verification</li>
        <li>Photos captured for attendance selfie verification</li>
        <li>Device information for security</li>
      </ul>

      <h2>How We Use Information</h2>

      <ul>
        <li>Manage bookings and rental operations</li>
        <li>Track payments and transactions</li>
        <li>Verify attendance using location and selfie</li>
        <li>Improve application performance</li>
      </ul>

      <h2>Third Party Services</h2>

      <p>
        Borezy uses secure services such as Firebase Authentication,
        Firebase Firestore, and Firebase Storage.
      </p>

      <h2>Contact</h2>

      <p>Email: support@borezy.com</p>
    </div>
  );
}