import React, { useMemo, useState } from "react";
import "./NotificationCenter.css";

const branches = [
  { id: "7007", name: "DOR Main Branch", city: "Pune", customers: 2480, tokens: 2186 },
  { id: "7008", name: "DOR West Branch", city: "Mumbai", customers: 1630, tokens: 1422 },
  { id: "7009", name: "DOR Central Branch", city: "Nashik", customers: 940, tokens: 801 },
];

const templates = [
  { label: "New collection", title: "New arrivals are here ✨", body: "Discover the latest styles at DOR. Explore the collection before your favourites are gone.", kind: "Promo" },
  { label: "Booking reminder", title: "A quick reminder from DOR", body: "Your upcoming booking is coming up soon. Open the app to review your booking details.", kind: "Reminder" },
  { label: "Special offer", title: "A little something for you 🎁", body: "Enjoy a special offer on your next visit. Open DOR to see what's waiting for you.", kind: "Offer" },
];

function Icon({ name, size = 18 }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  const paths = {
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    send: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
    chart: <><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-5 5" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    image: <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></>,
    sparkles: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-2-5.8L4 11l6-2.2Z" /><path d="m19 14 1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2Z" /></>,
    target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  };
  return <svg {...common}>{paths[name] || paths.bell}</svg>;
}

export default function NotificationCenter() {
  const [branchId, setBranchId] = useState("7007");
  const [audience, setAudience] = useState("all");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [deepLink, setDeepLink] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [priority, setPriority] = useState("normal");
  const [activeTab, setActiveTab] = useState("compose");
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState("");
  const [historyFilter, setHistoryFilter] = useState("All");

  const branch = branches.find((item) => item.id === branchId) || branches[0];
  const recipientCount = useMemo(() => {
    if (audience === "all") return branch.tokens;
    if (audience === "active") return Math.round(branch.tokens * 0.72);
    return Math.round(branch.tokens * 0.18);
  }, [audience, branch]);

  const applyTemplate = (template) => {
    setTitle(template.title);
    setMessage(template.body);
    setActiveTab("compose");
    setToast(`${template.label} template applied`);
    window.setTimeout(() => setToast(""), 2600);
  };

  const sendPreview = () => {
    if (!title.trim() || !message.trim()) {
      setToast("Add a notification title and message first.");
      window.setTimeout(() => setToast(""), 3000);
      return;
    }
    setShowConfirm(true);
  };

  const confirmSend = () => {
    setShowConfirm(false);
    setToast("Preview ready — connect your secure sending endpoint to deliver notifications.");
    window.setTimeout(() => setToast(""), 4500);
  };

  return (
    <div className="nc-app">
      <aside className="nc-sidebar">
        <div className="nc-brand">
          <div className="nc-brand-mark">D</div>
          <div><strong>DOR</strong><span>BUSINESS CONSOLE</span></div>
        </div>
        <div className="nc-workspace-label">WORKSPACE</div>
        <button className="nc-nav-item"><span className="nc-nav-icon">⌂</span> Overview</button>
        <button className="nc-nav-item"><span className="nc-nav-icon">▦</span> Bookings</button>
        <button className="nc-nav-item"><span className="nc-nav-icon">♙</span> Customers</button>
        <button className="nc-nav-item"><span className="nc-nav-icon">▤</span> Products</button>
        <div className="nc-workspace-label nc-nav-spacer">ENGAGEMENT</div>
        <button className="nc-nav-item active"><Icon name="bell" size={17} /> Notifications <span className="nc-nav-pill">NEW</span></button>
        <button className="nc-nav-item"><Icon name="chart" size={17} /> Analytics</button>
        <div className="nc-sidebar-bottom">
          <div className="nc-help-card">
            <div className="nc-help-icon"><Icon name="shield" size={18} /></div>
            <strong>Reach customers safely</strong>
            <p>Send to devices with a saved push token for the selected branch.</p>
            <span>Notification guide <Icon name="chevron" size={13} /></span>
          </div>
          <div className="nc-profile">
            <div className="nc-avatar">DR</div>
            <div className="nc-profile-copy"><strong>DOR Admin</strong><span>Branch administrator</span></div>
            <button aria-label="More profile options" className="nc-icon-button"><Icon name="more" /></button>
          </div>
        </div>
      </aside>

      <main className="nc-main">
        <header className="nc-topbar">
          <div className="nc-breadcrumb">Engagement <Icon name="chevron" size={13} /> <strong>Notifications</strong></div>
          <div className="nc-topbar-right">
            <span className="nc-live-dot" /> <span className="nc-status-label">Push service</span>
            <span className="nc-status-chip">UI preview</span>
            <div className="nc-top-avatar">DR</div>
          </div>
        </header>

        <div className="nc-content">
          <section className="nc-page-heading">
            <div>
              <div className="nc-eyebrow"><span className="nc-eyebrow-line" /> CUSTOMER ENGAGEMENT</div>
              <h1>Notification <span>Studio</span></h1>
              <p>Create thoughtful updates and deliver them to customers registered to a specific branch.</p>
            </div>
            <button className="nc-secondary-button" onClick={() => { setTitle(""); setMessage(""); setDeepLink(""); setImageUrl(""); setAudience("all"); setPriority("normal"); }}>
              <Icon name="sparkles" size={16} /> New campaign
            </button>
          </section>

          <section className="nc-stat-grid">
            <div className="nc-stat-card">
              <div className="nc-stat-top"><span>Reachable devices</span><span className="nc-stat-icon purple"><Icon name="users" /></span></div>
              <div className="nc-stat-value">{branch.tokens.toLocaleString("en-IN")}<small> devices</small></div>
              <div className="nc-stat-foot"><span className="nc-foot-dot green" /> Devices with a saved FCM token</div>
            </div>
            <div className="nc-stat-card">
              <div className="nc-stat-top"><span>Registered customers</span><span className="nc-stat-icon blue"><Icon name="target" /></span></div>
              <div className="nc-stat-value">{branch.customers.toLocaleString("en-IN")}<small> customers</small></div>
              <div className="nc-stat-foot">Across the selected branch</div>
            </div>
            <div className="nc-stat-card">
              <div className="nc-stat-top"><span>Estimated coverage</span><span className="nc-stat-icon amber"><Icon name="chart" /></span></div>
              <div className="nc-stat-value">{Math.round((branch.tokens / branch.customers) * 100)}<small>%</small></div>
              <div className="nc-progress"><span style={{ width: `${Math.min(100, (branch.tokens / branch.customers) * 100)}%` }} /></div>
              <div className="nc-stat-foot">Registered devices / customers</div>
            </div>
            <div className="nc-stat-card">
              <div className="nc-stat-top"><span>Recent campaigns</span><span className="nc-stat-icon green"><Icon name="clock" /></span></div>
              <div className="nc-stat-value">12<small> sent</small></div>
              <div className="nc-stat-foot"><span className="nc-foot-dot green" /> Demo data for layout preview</div>
            </div>
          </section>

          <div className="nc-workspace">
            <section className="nc-editor-panel">
              <div className="nc-panel-heading">
                <div><h2>Create notification</h2><p>Compose, target, and preview your push message.</p></div>
                <span className="nc-step-badge">CAMPAIGN DRAFT</span>
              </div>
              <div className="nc-tabs" role="tablist">
                <button className={activeTab === "compose" ? "selected" : ""} onClick={() => setActiveTab("compose")}><span>01</span> Compose</button>
                <button className={activeTab === "history" ? "selected" : ""} onClick={() => setActiveTab("history")}><span>02</span> Campaign history</button>
              </div>

              {activeTab === "compose" ? (
                <div className="nc-form">
                  <div className="nc-section-title"><span className="nc-section-number">1</span><div><strong>Delivery audience</strong><p>Choose which branch and customers should receive this message.</p></div></div>
                  <div className="nc-field">
                    <label htmlFor="nc-branch">Branch</label>
                    <div className="nc-select-wrap"><select id="nc-branch" value={branchId} onChange={(e) => setBranchId(e.target.value)}>{branches.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.city}</option>)}</select><span className="nc-select-chevron">⌄</span></div>
                    <small>Only customer devices associated with this branch are counted.</small>
                  </div>
                  <div className="nc-audience-options">
                    <button className={`nc-audience-option ${audience === "all" ? "chosen" : ""}`} onClick={() => setAudience("all")}>
                      <span className="nc-option-radio" /><span className="nc-audience-icon"><Icon name="users" size={17} /></span><span className="nc-audience-copy"><strong>All reachable devices</strong><small>Every saved FCM token for this branch</small></span><b>{branch.tokens.toLocaleString("en-IN")}</b>
                    </button>
                    <button className={`nc-audience-option ${audience === "active" ? "chosen" : ""}`} onClick={() => setAudience("active")}>
                      <span className="nc-option-radio" /><span className="nc-audience-icon"><Icon name="chart" size={17} /></span><span className="nc-audience-copy"><strong>Recently active</strong><small>Illustrative segment · backend filter needed</small></span><b>{Math.round(branch.tokens * 0.72).toLocaleString("en-IN")}</b>
                    </button>
                    <button className={`nc-audience-option ${audience === "offer" ? "chosen" : ""}`} onClick={() => setAudience("offer")}>
                      <span className="nc-option-radio" /><span className="nc-audience-icon"><Icon name="sparkles" size={17} /></span><span className="nc-audience-copy"><strong>Offer interested</strong><small>Illustrative segment · backend filter needed</small></span><b>{Math.round(branch.tokens * 0.18).toLocaleString("en-IN")}</b>
                    </button>
                  </div>
                  <div className="nc-reach-note"><Icon name="shield" size={16} /><span><strong>{recipientCount.toLocaleString("en-IN")} estimated recipients</strong><br />Actual delivery depends on valid tokens, notification permissions, and platform delivery.</span></div>

                  <div className="nc-form-divider" />
                  <div className="nc-section-title"><span className="nc-section-number">2</span><div><strong>Message content</strong><p>Keep it clear, useful, and easy to read on mobile.</p></div></div>
                  <div className="nc-template-row">
                    <span>Start with a template</span>
                    {templates.map((template) => <button key={template.label} onClick={() => applyTemplate(template)}>{template.label}<Icon name="chevron" size={12} /></button>)}
                  </div>
                  <div className="nc-field">
                    <div className="nc-label-row"><label htmlFor="nc-title">Notification title</label><span>{title.length}/60</span></div>
                    <input id="nc-title" maxLength={60} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. A special update from DOR" />
                  </div>
                  <div className="nc-field">
                    <div className="nc-label-row"><label htmlFor="nc-message">Message</label><span>{message.length}/180</span></div>
                    <textarea id="nc-message" maxLength={180} rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write a helpful message your customers will want to open…" />
                    <small>Tip: put the most important information first. Emojis are optional.</small>
                  </div>
                  <div className="nc-field">
                    <label htmlFor="nc-image">Image URL <span className="nc-optional">OPTIONAL</span></label>
                    <div className="nc-input-icon"><Icon name="image" size={17} /><input id="nc-image" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://your-domain.com/notification-image.jpg" /></div>
                    <small>Use a publicly accessible HTTPS image URL supported by your notification payload.</small>
                  </div>
                  <div className="nc-field">
                    <label htmlFor="nc-link">Open destination <span className="nc-optional">OPTIONAL</span></label>
                    <input id="nc-link" value={deepLink} onChange={(e) => setDeepLink(e.target.value)} placeholder="e.g. dor://offers or /booking-details" />
                    <small>Deep-link handling must be implemented in the customer app.</small>
                  </div>

                  <div className="nc-form-divider" />
                  <div className="nc-section-title"><span className="nc-section-number">3</span><div><strong>Delivery settings</strong><p>Choose how this campaign should be delivered.</p></div></div>
                  <div className="nc-priority-box">
                    <div><strong>Delivery priority</strong><p>Use normal priority for most announcements.</p></div>
                    <div className="nc-priority-toggle"><button className={priority === "normal" ? "on" : ""} onClick={() => setPriority("normal")}>Normal</button><button className={priority === "high" ? "on" : ""} onClick={() => setPriority("high")}>High</button></div>
                  </div>
                  <div className="nc-compliance-note"><Icon name="shield" size={17} /><p><strong>Before sending</strong><br />Confirm the selected branch, message, and audience. This page is currently a UI preview; it does not send push notifications until connected to a secure server-side Firebase Cloud Messaging endpoint.</p></div>
                  <div className="nc-form-actions"><button className="nc-reset-button" onClick={() => { setTitle(""); setMessage(""); setDeepLink(""); setImageUrl(""); }}>Clear draft</button><button className="nc-primary-button" onClick={sendPreview}>Review notification <Icon name="chevron" size={16} /></button></div>
                </div>
              ) : (
                <div className="nc-history">
                  <div className="nc-history-top"><div><strong>Campaign activity</strong><p>Sample rows shown for the design preview.</p></div><select value={historyFilter} onChange={(e) => setHistoryFilter(e.target.value)}><option>All</option><option>Sent</option><option>Draft</option><option>Failed</option></select></div>
                  {[
                    { title: "Weekend collection is live", date: "Today · 10:24 AM", status: "Sent", count: "2,186", color: "success" },
                    { title: "Booking confirmation update", date: "Yesterday · 4:05 PM", status: "Sent", count: "1,904", color: "success" },
                    { title: "Diwali preview campaign", date: "Oct 18 · 11:30 AM", status: "Draft", count: "—", color: "draft" },
                    { title: "Store update", date: "Oct 16 · 9:10 AM", status: "Failed", count: "0", color: "failed" },
                  ].filter((item) => historyFilter === "All" || item.status === historyFilter).map((item) => <div className="nc-history-row" key={item.title}><div className="nc-history-symbol"><Icon name="bell" size={17} /></div><div className="nc-history-main"><strong>{item.title}</strong><span>{item.date}</span></div><span className={`nc-history-status ${item.color}`}>{item.status}</span><b>{item.count}</b><button className="nc-icon-button" aria-label={`Open ${item.title}`}><Icon name="chevron" size={16} /></button></div>)}
                  <p className="nc-history-foot">Campaign history must be loaded from your database before production use.</p>
                </div>
              )}
            </section>

            <aside className="nc-preview-column">
              <div className="nc-preview-heading"><div><h2>Live preview</h2><p>See how the message may appear.</p></div><span className="nc-preview-live"><i /> LIVE</span></div>
              <div className="nc-phone-stage">
                <div className="nc-phone">
                  <div className="nc-phone-notch" />
                  <div className="nc-phone-status"><span>9:41</span><span>● ● ▰</span></div>
                  <div className="nc-wallpaper">
                    <div className="nc-lock-time">9:41</div><div className="nc-lock-date">Wednesday, October 21</div>
                    <div className="nc-notification-card">
                      <div className="nc-notification-app"><div className="nc-app-icon">D</div><span>DOR <small>now</small></span><span className="nc-notification-chevron">⌄</span></div>
                      <strong>{title.trim() || "Your notification title"}</strong>
                      <p>{message.trim() || "Your notification message will appear here. Keep it useful, warm, and easy to scan."}</p>
                      {imageUrl && <div className="nc-preview-image"><Icon name="image" size={18} /> Image attachment configured</div>}
                    </div>
                    <div className="nc-phone-bottom"><span>Flashlight</span><span>Camera</span></div>
                  </div>
                </div>
              </div>
              <div className="nc-preview-summary">
                <div className="nc-summary-top"><span>CAMPAIGN SUMMARY</span><Icon name="sparkles" size={16} /></div>
                <div className="nc-summary-row"><span>Branch</span><strong>{branch.name}</strong></div>
                <div className="nc-summary-row"><span>Audience</span><strong>{audience === "all" ? "All reachable devices" : audience === "active" ? "Recently active · demo" : "Offer interested · demo"}</strong></div>
                <div className="nc-summary-row"><span>Estimated reach</span><strong className="nc-reach-value">{recipientCount.toLocaleString("en-IN")} devices</strong></div>
                <div className="nc-summary-row"><span>Priority</span><strong>{priority === "high" ? "High" : "Normal"}</strong></div>
                {deepLink && <div className="nc-summary-row"><span>Destination</span><strong className="nc-destination">{deepLink}</strong></div>}
                <div className="nc-summary-divider" />
                <div className="nc-summary-tip"><span><Icon name="sparkles" size={16} /></span><p><strong>Make it feel personal</strong><br />A clear benefit and a specific next step can make your message more useful.</p></div>
              </div>
              <div className="nc-security-foot"><Icon name="shield" size={15} /><span>Secure delivery should happen server-side. Never expose Firebase service-account credentials in React.</span></div>
            </aside>
          </div>
          <footer className="nc-footer"><span>© 2026 DOR Business Console</span><span><i /> Notification Studio <b>·</b> Design preview</span></footer>
        </div>
      </main>

      {showConfirm && <div className="nc-modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setShowConfirm(false)}><div className="nc-modal" role="dialog" aria-modal="true" aria-labelledby="nc-modal-title"><div className="nc-modal-icon"><Icon name="send" size={22} /></div><h2 id="nc-modal-title">Review your notification</h2><p>This draft is addressed to <strong>{recipientCount.toLocaleString("en-IN")} estimated devices</strong> in {branch.name}.</p><div className="nc-modal-message"><strong>{title}</strong><span>{message}</span></div><div className="nc-modal-warning"><Icon name="shield" size={17} /> This preview cannot send messages yet. A secure Firebase Cloud Messaging backend must be connected first.</div><div className="nc-modal-actions"><button className="nc-reset-button" onClick={() => setShowConfirm(false)}>Go back</button><button className="nc-primary-button" onClick={confirmSend}>Confirm draft <Icon name="check" size={16} /></button></div></div></div>}
      {toast && <div className="nc-toast"><span><Icon name="check" size={16} /></span>{toast}</div>}
    </div>
  );
}
