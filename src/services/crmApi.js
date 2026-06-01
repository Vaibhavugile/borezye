import axios from "axios";

import {
  db
} from "../firebaseConfig";

import {
  doc,
  getDoc
} from "firebase/firestore";

// =========================
// API
// =========================

const crmApi =
  axios.create({

    baseURL:
      "https://crm-backendcalling-308303504367.asia-south1.run.app/api"
});

// =========================
// REQUEST INTERCEPTOR
// =========================

crmApi.interceptors.request.use(

  async (config) => {

    try {

      // =========================
      // USER
      // =========================

      const userData =
        JSON.parse(

          localStorage.getItem(
            "userData"
          )
        );

      // =========================
      // BRANCH CODE
      // =========================

      const branchCode =
        userData?.branchCode;

      if (!branchCode) {

        return config;
      }

      // =========================
      // FETCH BRANCH
      // =========================

      const branchRef =
        doc(
          db,
          "branches",
          branchCode
        );

      const branchSnap =
        await getDoc(
          branchRef
        );

      if (
        branchSnap.exists()
      ) {

        const branchData =
          branchSnap.data();

        // =========================
        // API KEY
        // =========================

        config.headers[
          "x-api-key"
        ] =
          branchData.crmApiKey || "";
      }

      return config;

    } catch (e) {

      console.error(
        "CRM API ERROR",
        e
      );

      return config;
    }
  }
);

export default crmApi;