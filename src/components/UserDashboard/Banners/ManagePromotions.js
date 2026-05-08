import React, { useEffect, useState } from "react";
import { collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../../firebaseConfig";
import { useUser } from "../../Auth/UserContext";
import "./ManagePromotions.css";

const ManagePromotions = () => {

const { userData } = useUser();
const branchCode = userData?.branchCode;

const [promos,setPromos] = useState([]);
const [title,setTitle] = useState("");
const [subtitle,setSubtitle] = useState("");
const [discount,setDiscount] = useState("");
const [imageFile,setImageFile] = useState(null);
const [preview,setPreview] = useState(null);

const fetchPromos = async ()=>{


if(!branchCode) return;

const snap = await getDocs(
  collection(db,`products/${branchCode}/promotions`)
);

const data = snap.docs.map(d=>({
  id:d.id,
  ...d.data()
}));

setPromos(data);


};

useEffect(()=>{
fetchPromos();
},[branchCode]);

const handleImageChange = (e)=>{


const file = e.target.files[0];

if(!file) return;

setImageFile(file);

const reader = new FileReader();

reader.onloadend=()=>{
  setPreview(reader.result);
};

reader.readAsDataURL(file);


};

const handleAdd = async ()=>{


if(!title || !imageFile){
  alert("Fill all fields");
  return;
}

const storageRef = ref(
  storage,
  `promotions/${branchCode}/${Date.now()}_${imageFile.name}`
);

await uploadBytes(storageRef,imageFile);

const imageUrl = await getDownloadURL(storageRef);

await addDoc(
  collection(db,`products/${branchCode}/promotions`),
  {
    title,
    subtitle,
    discount,
    imageUrl,
    order:promos.length+1,
    active:true,
    createdAt:new Date()
  }
);

setTitle("");
setSubtitle("");
setDiscount("");
setPreview(null);
setImageFile(null);

fetchPromos();


};

const handleDelete = async(id)=>{


await deleteDoc(
  doc(db,`products/${branchCode}/promotions/${id}`)
);

fetchPromos();


};

return(


<div className="promo-page">

  <h2 className="page-title">Manage Promotions</h2>

  <div className="upload-card">

    <div className="upload-left">

      <label className="file-upload">

        Select Image

        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
        />

      </label>

      <input
        type="text"
        placeholder="Title"
        value={title}
        onChange={(e)=>setTitle(e.target.value)}
      />

      <input
        type="text"
        placeholder="Subtitle"
        value={subtitle}
        onChange={(e)=>setSubtitle(e.target.value)}
      />

      <input
        type="text"
        placeholder="Discount Text (Example: 40% OFF)"
        value={discount}
        onChange={(e)=>setDiscount(e.target.value)}
      />

      <button
        className="upload-btn"
        onClick={handleAdd}
      >
        Add Promotion
      </button>

    </div>

    <div className="upload-right">

      {preview
        ? <img src={preview} className="preview-image"/>
        : <div className="preview-placeholder">Preview</div>
      }

    </div>

  </div>

  <div className="promo-grid">

    {promos.map((promo)=>(
      <div className="promo-card" key={promo.id}>

        <img
          src={promo.imageUrl}
          className="promo-image"
        />

        <div className="promo-info">

          <div>
            <b>{promo.title}</b>
            <p>{promo.discount}</p>
          </div>

          <button
            className="delete-btn"
            onClick={()=>handleDelete(promo.id)}
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

export default ManagePromotions;
