
import React from "react";
import { Link } from "react-router-dom";
import {
  Image,
  Layers,
  Megaphone,
  Grid3X3,
  CalendarHeart,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";

import "./BannerManagementDashboard.css";

const managementItems = [
  {
    title: "Manage Banners",
    description:
      "Create, update and organize promotional banners displayed across your store.",
    icon: Image,
    path: "/manage-banners",
    color: "#7C5CFC",
    bg: "#F0ECFF",
    tag: "Visual Content",
  },
  {
    title: "Manage Collections",
    description:
      "Organize your product collections and manage the shopping categories.",
    icon: Layers,
    path: "/manage-collections",
    color: "#0D9B83",
    bg: "#E6F8F3",
    tag: "Product Organization",
  },
  {
    title: "Manage Promotions",
    description:
      "Manage promotional campaigns, special offers and featured deals.",
    icon: Megaphone,
    path: "/manage-promotions",
    color: "#E58B32",
    bg: "#FFF3E5",
    tag: "Marketing",
  },
  {
    title: "Manage Sub Collections",
    description:
      "Create and maintain sub-collections for better product navigation.",
    icon: Grid3X3,
    path: "/manage-subcollection",
    color: "#3285D8",
    bg: "#EAF3FF",
    tag: "Store Structure",
  },
  {
    title: "Manage Occasions",
    description:
      "Manage occasion-based categories and organize products for special events.",
    icon: CalendarHeart,
    path: "/manage-occasions",
    color: "#DB5D91",
    bg: "#FFF0F6",
    tag: "Special Events",
  },
];

export default function BannerManagementDashboard() {
  return (
    <div className="banner-management-page">

      <div className="banner-management-header">
        <div>
          <div className="banner-management-eyebrow">
            <Sparkles size={15} />
            STORE MANAGEMENT
          </div>

          <h1>Manage Your Store</h1>

          <p>
            Everything you need to manage your banners, collections,
            promotions and shopping experiences in one place.
          </p>
        </div>

        <div className="banner-management-header-icon">
          <Image size={35} />
        </div>
      </div>

      <div className="banner-management-section-heading">
        <div>
          <h2>Management Center</h2>
          <p>Select a section to manage your store content.</p>
        </div>

        <span className="banner-management-count">
          {managementItems.length} Modules
        </span>
      </div>

      <div className="banner-management-grid">
        {managementItems.map((item, index) => {
          const Icon = item.icon;

          return (
            <Link
              to={item.path}
              className="banner-management-card"
              key={item.path}
              style={{ "--card-accent": item.color, "--card-bg": item.bg }}
            >
              <div className="banner-management-card-top">
                <div className="banner-management-icon">
                  <Icon size={25} strokeWidth={1.8} />
                </div>

                <span className="banner-management-arrow">
                  <ArrowUpRight size={19} />
                </span>
              </div>

              <span className="banner-management-tag">
                {item.tag}
              </span>

              <h3>{item.title}</h3>

              <p>{item.description}</p>

              <div className="banner-management-card-footer">
                <span>Open Management</span>
                <ArrowUpRight size={16} />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="banner-management-footer">
        <div className="banner-management-footer-icon">
          <Sparkles size={19} />
        </div>

        <div>
          <strong>Your store, beautifully organized.</strong>
          <p>
            Manage your store experience from one centralized dashboard.
          </p>
        </div>
      </div>

    </div>
  );
}
