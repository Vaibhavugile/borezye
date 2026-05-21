import React, {
  useEffect,
  useState
} from "react";

import "./BranchSettings.css";

import {
  doc,
  getDoc,
  updateDoc,
  Timestamp
} from "firebase/firestore";

import { db } from "../../../firebaseConfig";

import { useUser } from "../../Auth/UserContext";

import UserHeader from "../../UserDashboard/UserHeader";

import UserSidebar from "../../UserDashboard/UserSidebar";

const BranchSettings = () => {

  /* USER CONTEXT */

  const { userData } = useUser();

  const branchCode = userData?.branchCode;

  /* SIDEBAR */

  const [isSidebarOpen, setIsSidebarOpen] =
    useState(false);

  const toggleSidebar = () => {

    setIsSidebarOpen(!isSidebarOpen);

  };

  /* STATES */

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [settings, setSettings] =
  useState({

    /* BASIC INFO */

    branchName: "",

    ownerName: "",

    contactNumber: "",

    location: "",

    /* ATTENDANCE */

    attendanceRadius: 0,

    autoLogoutEnabled: false,

    lat: 0,

    lng: 0,

    /* SUBSCRIPTION */

    subscriptionType: "",

    activeDate: "",

    deactiveDate: "",

    numberOfUsers: 0,

    /* SECURITY */

    emailId: "",

    password: "",

    branchCode: "",

    createdBy: "",

    /* TIMESTAMPS */

    createdAt: null,

    updatedAt: null

  });

  /* FETCH SETTINGS */

  const fetchSettings = async () => {

    try {

      const ref = doc(

        db,

        "branches",

        branchCode

      );

      const snap = await getDoc(ref);

      if(snap.exists()){

        setSettings({

          id:snap.id,

          ...snap.data()

        });

      }

    } catch(err){

      console.log(err);

    }

    setLoading(false);

  };

  useEffect(()=>{

    if(branchCode){

      fetchSettings();

    }

  },[branchCode]);

  /* SAVE SETTINGS */

  const saveSettings = async () => {

    try {

      setSaving(true);

      await updateDoc(

        doc(
          db,
          "branches",
          branchCode
        ),

        {

          branchName:
            settings.branchName,

          ownerName:
            settings.ownerName,

          contactNumber:
            settings.contactNumber,

          location:
            settings.location,

       attendanceRadius:
  parseFloat(
    Number(settings.attendanceRadius)
  ).toFixed(2) * 1,

lat:
  parseFloat(settings.lat),

lng:
  parseFloat(settings.lng),
          autoLogoutEnabled:
            settings.autoLogoutEnabled,

          updatedAt:
            Timestamp.now()

        }

      );

      alert("Settings Updated");

    } catch(err){

      console.log(err);

      alert("Failed To Update");

    }

    setSaving(false);

  };

  /* LOADING */

  if(loading || !settings){

    return (

      <div className="settings-loading">

        Loading Settings...

      </div>

    );

  }

  return (

    <div className="settings-layout">

      <UserHeader
        onMenuClick={toggleSidebar}
      />

      <div className="settings-body">

        <UserSidebar
          isOpen={isSidebarOpen}
        />

        <div className="settings-page">

          {/* HEADER */}

          <div className="settings-header">

            <div>

              <h2>
                Branch Settings
              </h2>

              <p>
                Manage branch configuration
              </p>

            </div>

            <button
              className="save-settings-btn"
              onClick={saveSettings}
            >

              {
                saving
                  ? "Saving..."
                  : "Save Settings"
              }

            </button>

          </div>

          {/* SETTINGS GRID */}

          <div className="settings-grid">

            {/* BASIC INFO */}

            <div className="settings-card">

              <h3>
                Basic Information
              </h3>

              <label>
                Branch Name
              </label>

              <input
                value={settings.branchName || ""}
                onChange={(e)=>

                  setSettings({

                    ...settings,

                    branchName:
                      e.target.value

                  })

                }
              />

              <label>
                Owner Name
              </label>

              <input
                value={settings.ownerName || ""}
                onChange={(e)=>

                  setSettings({

                    ...settings,

                    ownerName:
                      e.target.value

                  })

                }
              />

              <label>
                Contact Number
              </label>

              <input
                value={
                  settings.contactNumber || ""
                }
                onChange={(e)=>

                  setSettings({

                    ...settings,

                    contactNumber:
                      e.target.value

                  })

                }
              />

              <label>
                Location
              </label>

              <input
                value={settings.location || ""}
                onChange={(e)=>

                  setSettings({

                    ...settings,

                    location:
                      e.target.value

                  })

                }
              />

            </div>

            {/* ATTENDANCE */}

            <div className="settings-card">

              <h3>
                Attendance Settings
              </h3>

              <label>
                Attendance Radius
              </label>

              <input
  type="number"

  step="0.01"

  value={
    settings.attendanceRadius || ""
  }

  onChange={(e)=>

    setSettings({

      ...settings,

      attendanceRadius:
        parseFloat(
          e.target.value
        )

    })

  }
/>

              <label>
                Latitude
              </label>

              <input
                type="number"
                value={settings.lat || ""}
                onChange={(e)=>

                  setSettings({

                    ...settings,

                    lat:e.target.value

                  })

                }
              />

              <label>
                Longitude
              </label>

              <input
                type="number"
                value={settings.lng || ""}
                onChange={(e)=>

                  setSettings({

                    ...settings,

                    lng:e.target.value

                  })

                }
              />

              <div className="switch-row">

                <span>
                  Auto Logout Enabled
                </span>

                <input
                  type="checkbox"
                  checked={
                    settings.autoLogoutEnabled
                  }

                  onChange={(e)=>

                    setSettings({

                      ...settings,

                      autoLogoutEnabled:
                        e.target.checked

                    })

                  }
                />

              </div>

            </div>

            {/* SUBSCRIPTION */}

            <div className="settings-card readonly-card">

              <h3>
                Subscription Details
              </h3>

              <div className="readonly-field">

                <label>
                  Subscription Type
                </label>

                <p>
                  {settings.subscriptionType}
                </p>

              </div>

              <div className="readonly-field">

                <label>
                  Active Date
                </label>

                <p>
                  {settings.activeDate}
                </p>

              </div>

              <div className="readonly-field">

                <label>
                  Deactive Date
                </label>

                <p>
                  {settings.deactiveDate}
                </p>

              </div>

              <div className="readonly-field">

                <label>
                  Number Of Users
                </label>

                <p>
                  {settings.numberOfUsers}
                </p>

              </div>

            </div>

            {/* SECURITY */}

            <div className="settings-card readonly-card">

              <h3>
                Security & System
              </h3>

              <div className="readonly-field">

                <label>
                  Email ID
                </label>

                <p>
                  {settings.emailId}
                </p>

              </div>

              <div className="readonly-field">

                <label>
                  Password
                </label>

                <p>
                  ••••••••
                </p>

              </div>

              <div className="readonly-field">

                <label>
                  Branch Code
                </label>

                <p>
                  {settings.branchCode}
                </p>

              </div>

              <div className="readonly-field">

                <label>
                  Created By
                </label>

                <p>
                  {settings.createdBy}
                </p>

              </div>

              <div className="readonly-field">

                <label>
                  Created At
                </label>

                <p>

                  {
                    settings.createdAt?.seconds

                    ? new Date(
                        settings.createdAt.seconds * 1000
                      ).toLocaleString("en-IN")

                    : "-"
                  }

                </p>

              </div>

              <div className="readonly-field">

                <label>
                  Updated At
                </label>

                <p>

                  {
                    settings.updatedAt?.seconds

                    ? new Date(
                        settings.updatedAt.seconds * 1000
                      ).toLocaleString("en-IN")

                    : "-"
                  }

                </p>

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>

  );

};

export default BranchSettings;