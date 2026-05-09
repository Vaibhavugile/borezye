import React, { useState } from "react";
import "./landing.css";
import boy from "../../assets/boy.png";
import logo from "../../assets/Borebgr.png";
import icon from "../../assets/icon.png";

import emailjs from "emailjs-com";
import { FaAngleUp, FaAngleDown } from 'react-icons/fa'
import girrrl from "../../assets/contact_girl.png";
import { FaFacebook, FaInstagram, FaTwitter, FaLinkedinIn } from "react-icons/fa";
import bulb from "../../assets/light-bulb.png"
import vaisaki from "../../assets/performance.png"
import inventoryIcon from "../../assets/supplier.png"
import customerIcon from "../../assets/public-relation.png"
import realTimeIcon from "../../assets/24-hours-support.png"
import scalableIcon from "../../assets/energy-consumption.png"
import secureIcon from "../../assets/cyber-security.png"
import analyticsIcon from "../../assets/seo-report.png"
import { toast, ToastContainer } from 'react-toastify'; // Import react-toastify
import 'react-toastify/dist/ReactToastify.css'; // Import CSS for react-toastify
import { useNavigate } from 'react-router-dom';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Helmet } from "react-helmet-async";
import dashboardImage from "../../assets/desktopbore.png";

import mobileImage from "../../assets/boremobile.png";

import heroPreview from "../../assets/heropreview.png";
import "./landingfeatures.css";
import "./landigecosystem.css";
import "./landigpricing.css";
import "./landingcontact.css";
import "./landingfooter.css";


function Landing() {

  const [activeIndex, setActiveIndex] = useState(null);
  const navigate = useNavigate();
  const toggleFAQ = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };
  const [isModalOpen, setIsModalOpen] = useState(false);
  const handleOpenModal = () => {
    console.log("Opening Modal");
    setIsModalOpen(true);
  };
const analyticsImage =
  "https://placehold.co/800x500/f8f5ff/7c3aed?text=Analytics+Dashboard";

const mobileDashboard =
  "https://placehold.co/400x700/f8f5ff/7c3aed?text=Mobile+App";

const darkDashboard =
  "https://placehold.co/800x500/111827/c084fc?text=Admin+Panel";

const customerPortal =
  "https://placehold.co/800x500/faf7ff/7c3aed?text=Customer+Portal";
  const handleCloseModal = () => {
    console.log("Closing Modal");
    setIsModalOpen(false);
  };
const handleFormSubmit = async (e, source) => {
  e.preventDefault();

  const form = e.target;
  const formData = new FormData(form);

  // Extract common fields
  const name = formData.get('name') || '';
  const emailId = formData.get('emailId') || formData.get('email') || '';
  const contactNumber = formData.get('contactNumber') || '';
  const businessName = formData.get('businessName') || '';
  const comment = formData.get('comment') || '';

  try {
    await addDoc(collection(db, 'leads'), {
      businessName,
      contactNumber,
      emailId,
      name,
      comment,
      source, // 'demo' or 'contact'
      createdAt: new Date() // optional timestamp
    });

    alert("Form submitted successfully!");
    form.reset();
  } catch (error) {
    console.error("Error adding document: ", error);
    alert("Failed to submit form.");
  }
};
  const handleclicksign = () => {
    navigate('/Login');
  };
  return (
     <>
      {/* 🔹 SEO START */}
      <Helmet>
  {/* Basic SEO */}
  <title>Borezy | Rental Business Management Software</title>

  <meta
    name="description"
    content="Borezy is an all-in-one rental business management platform to manage inventory, customers, subscriptions, pricing, and business performance."
  />

  <meta
    name="keywords"
    content="rental business software, rental management system, inventory rental software, asset rental platform"
  />

  <link rel="canonical" href="https://borezy.com/" />

  {/* Organization Schema */}
  <script type="application/ld+json">
    {`
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Borezy",
      "url": "https://borezy.com",
      "logo": "https://borezy.com/logo192.png",
      "description": "Borezy is an all-in-one rental business management software for inventory, customers, subscriptions, and analytics.",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Pune",
        "addressCountry": "IN"
      },
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "sales",
        "email": "borezydev@gmail.com"
      }
    }
    `}
  </script>

  {/* Software Application Schema */}
  <script type="application/ld+json">
    {`
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Borezy",
      "operatingSystem": "Web",
      "applicationCategory": "BusinessApplication",
      "description": "Rental business management platform to manage inventory, pricing, customers, and business performance.",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "INR"
      },
      "url": "https://borezy.com"
    }
    `}
  </script>
</Helmet>

    <div className="App">
      <header className="navbar">

  {/* LOGO */}
  {/* LOGO */}
<div className="navbar-left">

  <div className="logo-wrapper">

    <img
      src={icon}
      alt="Borezy Logo"
      className="logo"
    />

    <img
      src={logo}
      alt="Borezy"
      className="brand-logo-text"
    />

  </div>

</div>

  {/* CENTER NAV */}
  <nav className="nav-links">

    <a href="#features">Features</a>

    <a href="#ecosystem">Ecosystem</a>

    <a href="#pricing">Pricing</a>

    <a href="#testimonials">Testimonials</a>

  </nav>

  {/* RIGHT ACTIONS */}
  <div className="navbar-right">

    <button className="nav-secondary-btn" onClick={handleOpenModal}>
      Book Demo
    </button>

    <button
      className="nav-primary-btn"
      onClick={handleclicksign}
    >
      Start Free Trial
    </button>

  </div>

</header>
<section className="hero-section">

  {/* PREMIUM BACKGROUND */}
  <div className="hero-glow glow-1"></div>
  <div className="hero-glow glow-2"></div>
  <div className="hero-noise"></div>

  <div className="hero-container">

    {/* =========================
        LEFT SIDE
    ========================= */}
    <div className="hero-left">

      {/* BADGE */}
      <div className="hero-badge">

        <span>✦</span>

        AI-Powered Rental OS

      </div>

      {/* TITLE */}
      <h1 className="hero-title">

        The Operating <br />

        System for <span>Modern Rentals</span>

      </h1>

      {/* DESCRIPTION */}
      <p className="hero-description">

        Unify inventory, bookings, workforce operations,
        customer experiences, analytics, and payments
        into one premium ecosystem designed for modern
        rental businesses.

      </p>

      {/* BUTTONS */}
      <div className="hero-buttons">

        <button className="primary-btn">

          Start Free Trial

        </button>

        <button className="secondary-btn" onClick={handleOpenModal}>

          <span>▶</span>

          Watch Demo

        </button>

      </div>

      {/* TRUST STATS */}
      <div className="hero-stats">

        <div className="stat-card">

          <h3>5000+</h3>

          <span>Bookings Managed</span>

        </div>

        <div className="stat-card">

          <h3>120+</h3>

          <span>Businesses Scaling</span>

        </div>

        <div className="stat-card">

          <h3>99.9%</h3>

          <span>Cloud Reliability</span>

        </div>

      </div>

    </div>

    {/* =========================
        RIGHT SIDE
    ========================= */}
    <div className="hero-right">

      {/* MAIN IMAGE */}
      <div className="hero-preview-wrapper floating-main">

        <img
          src={heroPreview}
          alt="Borezy Platform Preview"
          className="hero-preview-image"
        />

      </div>

      {/* REVENUE CARD */}
      
      {/* BOOKING CARD */}
      <div className="floating-card booking-landingcard">

        <div className="booking-icon">

          ✓

        </div>

        <div>

          <h5>Booking Confirmed</h5>

          <p>Aarav Events • 12 Items</p>

        </div>

      </div>

      {/* SMALL ANALYTICS CARD */}
      <div className="floating-card analytics-mini-card">

        <div className="mini-chart">

          <span></span>
          <span></span>
          <span></span>
          <span></span>

        </div>

        <div className="mini-content">

          <h6>Bookings</h6>

          <p>+32% increase</p>

        </div>

      </div>

      {/* BACKGROUND GLOW */}
      <div className="hero-right-glow"></div>

    </div>

  </div>

</section>
      {isModalOpen && (
        <div className="modal-overlay1">
          <div className="modal-content1">
            <button className="close-button" onClick={handleCloseModal}>
              &times;
            </button>
           <h2>Request a Demo</h2>
<form className="demo-form" onSubmit={(e) => handleFormSubmit(e, 'demo')}>
  <input type="text" name="name" placeholder="Full name" required />
  <input type="text" name="businessName" placeholder="Business name" required />
  <input type="number" name="contactNumber" placeholder="Contact number" required />
  <input type="email" name="emailId" placeholder="Email Address" required />
  <button type="submit">Submit</button>
</form>
          </div>
        </div>
      )}

     {/* =========================================
    FEATURES SECTION
========================================= */}

<section className="features-section" id="features">

  {/* BACKGROUND */}
  <div className="features-glow"></div>

  <div className="features-container">

    {/* TOP CONTENT */}
    <div className="features-header">

      <div className="section-badge">

        <span>✦</span>

        Complete Rental Ecosystem

      </div>

      <h2>

        Tools Engineered <br />

        for <span>Rental Excellence</span>

      </h2>

      <p>

        Borezy combines operations, inventory, customer
        management, analytics, workforce tracking, and
        digital storefronts into one beautifully unified
        ecosystem for modern rental businesses.

      </p>

    </div>

    {/* FEATURES GRID */}
    <div className="features-grid">

      {/* FEATURE 1 */}
      <div className="feature-card featured-card">

        <div className="feature-icon">
          📦
        </div>

        <h3>Inventory Management</h3>

        <p>
          Track stock levels, rental availability,
          item conditions, damages, and warehouse
          movements in real-time.
        </p>

        <div className="feature-line"></div>

      </div>

      {/* FEATURE 2 */}
      <div className="feature-card">

        <div className="feature-icon">
          📅
        </div>

        <h3>Smart Bookings</h3>

        <p>
          Automate bookings, scheduling, invoices,
          return tracking, and customer confirmations
          from a unified dashboard.
        </p>

      </div>

      {/* FEATURE 3 */}
      <div className="feature-card">

        <div className="feature-icon">
          👥
        </div>

        <h3>Customer Portal</h3>

        <p>
          Customers can browse products, manage
          bookings, track receipts, payments,
          and rental history seamlessly.
        </p>

      </div>

      {/* FEATURE 4 */}
      <div className="feature-card">

        <div className="feature-icon">
          🌐
        </div>

        <h3>Website Builder</h3>

        <p>
          Launch your rental website instantly
          with premium storefronts, online booking,
          and integrated checkout experiences.
        </p>

      </div>

      {/* FEATURE 5 */}
      <div className="feature-card">

        <div className="feature-icon">
          📱
        </div>

        <h3>Mobile Apps</h3>

        <p>
          Dedicated apps for customers and providers
          with booking management, inventory access,
          notifications, and analytics.
        </p>

      </div>

      {/* FEATURE 6 */}
      <div className="feature-card">

        <div className="feature-icon">
          📊
        </div>

        <h3>Analytics Dashboard</h3>

        <p>
          Gain real-time insights into revenue,
          bookings, inventory usage, customer
          behavior, and business growth.
        </p>

      </div>

      {/* FEATURE 7 */}
      <div className="feature-card">

        <div className="feature-icon">
          👨‍💼
        </div>

        <h3>Staff & Attendance</h3>

        <p>
          Manage employees, attendance tracking,
          roles, permissions, workforce activities,
          and operational productivity.
        </p>

      </div>

      {/* FEATURE 8 */}
      <div className="feature-card">

        <div className="feature-icon">
          💳
        </div>

        <h3>Payments & Billing</h3>

        <p>
          Simplify payments, deposits, invoices,
          automated reminders, subscriptions,
          and financial tracking.
        </p>

      </div>

    </div>

  </div>

</section>
{/* =========================================
    ECOSYSTEM SECTION
========================================= */}

<section className="ecosystem-section" id="ecosystem">

  {/* BACKGROUND */}
  <div className="ecosystem-glow"></div>

  <div className="ecosystem-container">

    {/* LEFT CONTENT */}
    <div className="ecosystem-left">

      <div className="section-badge">

        <span>✦</span>

        Complete Ecosystem

      </div>

      <h2>

        One Source of Truth <br />

        for <span>Your Entire Rental Business</span>

      </h2>

      <p>

        Borezy centralizes inventory, customer management,
        staff operations, analytics, bookings, payments,
        and websites into one beautifully connected
        operating system.

      </p>

      {/* FEATURE LIST */}
      <div className="ecosystem-features">

        {/* ITEM */}
        <div className="ecosystem-item">

          <div className="ecosystem-number">
            1
          </div>

          <div>

            <h4>Admin Command Center</h4>

            <p>
              Manage inventory, staff, analytics,
              bookings, invoices, and workflows
              from a single dashboard.
            </p>

          </div>

        </div>

        {/* ITEM */}
        <div className="ecosystem-item">

          <div className="ecosystem-number">
            2
          </div>

          <div>

            <h4>Ground Workforce App</h4>

            <p>
              Attendance tracking, item handling,
              delivery updates, and workforce
              coordination in real-time.
            </p>

          </div>

        </div>

        {/* ITEM */}
        <div className="ecosystem-item">

          <div className="ecosystem-number">
            3
          </div>

          <div>

            <h4>Customer Experience Portal</h4>

            <p>
              Customers can browse products,
              place bookings, track rentals,
              payments, and receipts seamlessly.
            </p>

          </div>

        </div>

      </div>

    </div>

    {/* RIGHT SIDE */}
    <div className="ecosystem-right">

      {/* IMAGE GRID */}
      <div className="ecosystem-grid">

        {/* LARGE IMAGE */}
        <div className="ecosystem-image large-image">

          <img
            src={analyticsImage}
            alt="Analytics Dashboard"
          />

        </div>

        {/* PHONE IMAGE */}
        <div className="ecosystem-image phone-image">

          <img
            src={mobileDashboard}
            alt="Mobile Dashboard"
          />

        </div>

        {/* DARK IMAGE */}
        <div className="ecosystem-image dark-image">

          <img
            src={darkDashboard}
            alt="Admin Panel"
          />

        </div>

        {/* CUSTOMER IMAGE */}
        <div className="ecosystem-image customer-image">

          <img
            src={customerPortal}
            alt="Customer Portal"
          />

        </div>

      </div>

    </div>

  </div>

</section>



      {/* =========================================
    PRICING SECTION
========================================= */}

<section className="pricing-section" id="pricing">

  {/* BACKGROUND */}
  <div className="pricing-glow pricing-glow-1"></div>
  <div className="pricing-glow pricing-glow-2"></div>

  <div className="pricing-container">

    {/* HEADER */}
    <div className="pricing-header">

      <div className="section-badge">

        <span>✦</span>

        Transparent Pricing

      </div>

      <h2>

        Pricing Designed <br />

        for <span>Every Rental Business</span>

      </h2>

      <p>

        Whether you're starting small or scaling a large
        rental ecosystem, Borezy provides the perfect
        combination of admin systems, customer apps,
        websites, analytics, and automation.

      </p>

    </div>

    {/* PRICING GRID */}
    <div className="pricing-grid">

      {/* =====================================
          STARTER PLAN
      ===================================== */}
      <div className="pricing-card starter-plan">

        <div className="plan-top">

          <span className="plan-label">
            Starter
          </span>

          <h3>₹999</h3>

          <p>/month</p>

        </div>

        <div className="plan-divider"></div>

        <ul>

          <li>✔ Admin Dashboard</li>

          <li>✔ Inventory Management</li>

          <li>✔ Booking System</li>

          <li>✔ Staff Management</li>

          <li>✔ Analytics Dashboard</li>

          <li>✔ Basic Reports</li>

        </ul>

        <button>
          Get Started
        </button>

      </div>

      {/* =====================================
          GROWTH PLAN
      ===================================== */}
      <div className="pricing-card featured-plan">

        <div className="popular-badge">

          MOST POPULAR

        </div>

        <div className="plan-top">

          <span className="plan-label">
            Growth
          </span>

          <h3>₹2499</h3>

          <p>/month</p>

        </div>

        <div className="plan-divider"></div>

        <ul>

          <li>✔ Everything in Starter</li>

          <li>✔ Customer Mobile App</li>

          <li>✔ Provider Mobile App</li>

          <li>✔ Rental Website</li>

          <li>✔ Online Booking Portal</li>

          <li>✔ Payment Integration</li>

          <li>✔ Invoice Automation</li>

          <li>✔ WhatsApp Notifications</li>

        </ul>

        <button>
          Start Scaling
        </button>

      </div>

      {/* =====================================
          ENTERPRISE PLAN
      ===================================== */}
      <div className="pricing-card enterprise-plan">

        <div className="plan-top">

          <span className="plan-label">
            Enterprise
          </span>

          <h3>Custom</h3>

          <p>tailored pricing</p>

        </div>

        <div className="plan-divider"></div>

        <ul>

          <li>✔ Full Borezy Ecosystem</li>

          <li>✔ Custom Branding</li>

          <li>✔ Dedicated Support</li>

          <li>✔ AI Analytics</li>

          <li>✔ Advanced Automation</li>

          <li>✔ Multiple Branches</li>

          <li>✔ Custom Integrations</li>

          <li>✔ Priority Infrastructure</li>

        </ul>

        <button>
          Contact Sales
        </button>

      </div>

    </div>

  </div>

</section>

      {/* =========================================
    TESTIMONIALS SECTION
========================================= */}

{/* =========================================
    SLIDING TESTIMONIALS SECTION
========================================= */}

<section className="testimonials-section" id="testimonials">

  {/* BACKGROUND */}
  <div className="testimonials-glow"></div>

  <div className="testimonials-container">

    {/* HEADER */}
    <div className="testimonials-header">

      <div className="section-badge">

        <span>✦</span>

        Trusted by Rental Businesses

      </div>

      <h2>

        Loved by <span>Modern Rental Teams</span>

      </h2>

      <p>

        Borezy helps rental businesses streamline
        operations, automate workflows, and deliver
        premium customer experiences at scale.

      </p>

    </div>

    {/* SLIDER */}
    <div className="testimonials-slider">

      <div className="testimonials-track">

        {/* CARD 1 */}
        <div className="testimonial-card">

          <div className="stars">
            ★★★★★
          </div>

          <p className="testimonial-text">

            “Borezy completely transformed our
            inventory and booking workflow.
            Everything feels centralized and premium.”

          </p>

          <div className="testimonial-user">

            <div className="user-avatar">
              A
            </div>

            <div>

              <h4>Alex Rivera</h4>

              <span>LUXE EVENT RENTALS</span>

            </div>

          </div>

        </div>

        {/* CARD 2 */}
        <div className="testimonial-card featured-testimonial">

          <div className="stars">
            ★★★★★
          </div>

          <p className="testimonial-text">

            “The customer app and rental website
            increased our bookings significantly
            within weeks.”

          </p>

          <div className="testimonial-user">

            <div className="user-avatar">
              S
            </div>

            <div>

              <h4>Sarah Chen</h4>

              <span>SPOTLIGHT MEDIA</span>

            </div>

          </div>

        </div>

        {/* CARD 3 */}
        <div className="testimonial-card">

          <div className="stars">
            ★★★★★
          </div>

          <p className="testimonial-text">

            “Managing staff, analytics, and
            bookings from one platform saved
            our operations team countless hours.”

          </p>

          <div className="testimonial-user">

            <div className="user-avatar">
              M
            </div>

            <div>

              <h4>Marcus Thompson</h4>

              <span>GLOBAL PRODUCTIONS</span>

            </div>

          </div>

        </div>

        {/* CARD 4 */}
        <div className="testimonial-card">

          <div className="stars">
            ★★★★★
          </div>

          <p className="testimonial-text">

            “The provider app is incredibly smooth.
            Our staff now handle deliveries and
            attendance without confusion.”

          </p>

          <div className="testimonial-user">

            <div className="user-avatar">
              D
            </div>

            <div>

              <h4>Daniel Foster</h4>

              <span>EVENT HUB INDIA</span>

            </div>

          </div>

        </div>

        {/* CARD 5 */}
        <div className="testimonial-card">

          <div className="stars">
            ★★★★★
          </div>

          <p className="testimonial-text">

            “From websites to analytics and customer
            bookings, Borezy feels like a premium
            enterprise ecosystem.”

          </p>

          <div className="testimonial-user">

            <div className="user-avatar">
              J
            </div>

            <div>

              <h4>Jessica Lee</h4>

              <span>ROYAL RENTALS</span>

            </div>

          </div>

        </div>

        {/* DUPLICATES FOR LOOP */}

        <div className="testimonial-card">

          <div className="stars">
            ★★★★★
          </div>

          <p className="testimonial-text">

            “Borezy completely transformed our
            inventory and booking workflow.”

          </p>

          <div className="testimonial-user">

            <div className="user-avatar">
              A
            </div>

            <div>

              <h4>Alex Rivera</h4>

              <span>LUXE EVENT RENTALS</span>

            </div>

          </div>

        </div>

        <div className="testimonial-card featured-testimonial">

          <div className="stars">
            ★★★★★
          </div>

          <p className="testimonial-text">

            “The customer app and rental website
            increased our bookings significantly.”

          </p>

          <div className="testimonial-user">

            <div className="user-avatar">
              S
            </div>

            <div>

              <h4>Sarah Chen</h4>

              <span>SPOTLIGHT MEDIA</span>

            </div>

          </div>

        </div>

      </div>

    </div>

  </div>

</section>



      {/* =========================================
    CTA SECTION
========================================= */}

<section className="cta-section">

  {/* GLOW */}
  <div className="cta-glow"></div>

  <div className="cta-container">

    {/* CONTENT */}
    <div className="cta-content">

      <div className="section-badge dark-badge">

        <span>✦</span>

        Ready to Scale?

      </div>

      <h2>

        The Future of Rentals <br />

        Starts with <span>Borezy</span>

      </h2>

      <p>

        Join modern rental businesses using Borezy
        to streamline operations, automate workflows,
        and deliver premium customer experiences.

      </p>

      {/* BUTTONS */}
      <div className="cta-buttons">

        <button className="cta-primary-btn">

          Start Free Trial

        </button>

       <button
  className="nav-secondary-btn"
  onClick={handleOpenModal}
>
  Book Demo
</button>

      </div>

      {/* TRUST */}
      <div className="cta-trust">

        <div className="trust-item">

          <span>✔</span>

          No setup fees

        </div>

        <div className="trust-item">

          <span>✔</span>

          Cancel anytime

        </div>

        <div className="trust-item">

          <span>✔</span>

          Premium support

        </div>

      </div>

    </div>

  </div>

</section>

      {/* =========================================
    FOOTER SECTION
========================================= */}

<footer className="footer-section" id="contact">

  {/* GLOW */}
  <div className="footer-glow"></div>

  <div className="footer-container">

    {/* =====================================
        TOP
    ===================================== */}
    <div className="footer-top">

      {/* LEFT */}
      <div className="footer-brand">

        <div className="footer-logo">

          <div className="footer-logo-icon">
            B
          </div>

          <h2>Borezy</h2>

        </div>

        <p>

          The premium operating system for modern
          rental businesses. Manage inventory,
          bookings, workforce, customer apps,
          websites, and analytics — all in one place.

        </p>

        {/* SOCIALS */}
        <div className="footer-socials">

          <a href="/">
            𝕏
          </a>

          <a href="/">
            in
          </a>

          <a href="/">
            ◎
          </a>

          <a href="/">
            ⌘
          </a>

        </div>

      </div>

      {/* LINKS */}
      <div className="footer-links-wrapper">

        {/* PRODUCT */}
        <div className="footer-links">

          <h4>Product</h4>

          <a href="#features">
            Features
          </a>

          <a href="#ecosystem">
            Ecosystem
          </a>

          <a href="#pricing">
            Pricing
          </a>

          <a href="#testimonials">
            Testimonials
          </a>

        </div>

        {/* COMPANY */}
        <div className="footer-links">

          <h4>Company</h4>

          <a href="/">
            About
          </a>

          <a href="/">
            Careers
          </a>

          <a href="/">
            Blog
          </a>

          <a href="/">
            Contact
          </a>

        </div>

        {/* SUPPORT */}
        <div className="footer-links">

          <h4>Support</h4>

          <a href="/">
            Help Center
          </a>

          <a href="/">
            Privacy Policy
          </a>

          <a href="/">
            Terms of Service
          </a>

          <a href="/">
            FAQs
          </a>

        </div>

      </div>

    </div>

    {/* =====================================
        BOTTOM
    ===================================== */}
    <div className="footer-bottom">

      <p>

        © 2026 Borezy Technologies. All rights reserved.

      </p>

      <div className="footer-bottom-links">

        <a href="/privacy">
          Privacy
        </a>

        <a href="/privacy">
          Terms
        </a>

        <a href="/support">
          Support
        </a>

      </div>

    </div>

  </div>

</footer>
      <ToastContainer/>
    </div>
    </>
  );
}

export default Landing;