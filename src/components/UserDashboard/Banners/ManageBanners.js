import React, { useEffect, useState } from "react";
import { collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../../firebaseConfig";
import { useUser } from "../../Auth/UserContext";
import "./ManageBanners.css";

const ManageBanners = () => {

const { userData } = useUser();
const branchCode = userData?.branchCode;

const [banners, setBanners] = useState([]);
const [title, setTitle] = useState("");
const [imageFile, setImageFile] = useState(null);
const [preview, setPreview] = useState(null);
const [loading, setLoading] = useState(false);

const fetchBanners = async () => {


if (!branchCode) return;

const snap = await getDocs(
  collection(db, `products/${branchCode}/banners`)
);

const data = snap.docs.map(d => ({
  id: d.id,
  ...d.data()
}));

setBanners(data);


};

useEffect(() => {
fetchBanners();
}, [branchCode]);

const handleImageChange = (e) => {


const file = e.target.files[0];

if (!file) return;

setImageFile(file);

const reader = new FileReader();

reader.onloadend = () => {
  setPreview(reader.result);
};

reader.readAsDataURL(file);


};

const handleUpload = async () => {


if (!imageFile) {
  alert("Please select an image");
  return;
}

setLoading(true);

try {

  const storageRef = ref(
    storage,
    `banners/${branchCode}/${Date.now()}_${imageFile.name}`
  );

  await uploadBytes(storageRef, imageFile);

  const imageUrl = await getDownloadURL(storageRef);

  await addDoc(
    collection(db, `products/${branchCode}/banners`),
    {
      imageUrl,
      title,
      createdAt: new Date()
    }
  );

  setImageFile(null);
  setPreview(null);
  setTitle("");

  fetchBanners();

} catch (error) {

  console.error(error);
  alert("Upload failed");

}

setLoading(false);


};

const handleDelete = async (id) => {


await deleteDoc(
  doc(db, `products/${branchCode}/banners/${id}`)
);

fetchBanners();


};

return (


<div className="banner-page">

  <h2 className="page-title">Manage Home Banners</h2>

  <div className="upload-card">

    <div className="upload-left">

      <label className="file-upload">

        Select Banner Image

        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
        />

      </label>

      <input
        type="text"
        placeholder="Banner Title"
        value={title}
        onChange={(e)=>setTitle(e.target.value)}
      />

      <button
        className="upload-btn"
        onClick={handleUpload}
      >
        {loading ? "Uploading..." : "Upload Banner"}
      </button>

    </div>

    <div className="upload-right">

      {preview ? (

        <img
          src={preview}
          alt="preview"
          className="preview-image"
        />

      ) : (

        <div className="preview-placeholder">
          Image Preview
        </div>

      )}

    </div>

  </div>

  <div className="banner-grid">

    {banners.map((banner)=>(
      <div className="banner-card" key={banner.id}>

        <img
          src={banner.imageUrl}
          alt=""
          className="banner-image"
        />

        <div className="banner-info">

          <p>{banner.title}</p>

          <button
            className="delete-btn"
            onClick={()=>handleDelete(banner.id)}
          >
            Delete
          </button>

        </div>

      </div>
    ))}

  </div>

</div>


);
};

export default ManageBanners;
