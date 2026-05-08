import React, { useEffect, useState } from "react";
import { collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../../firebaseConfig";
import { useUser } from "../../Auth/UserContext";
import "./ManageCollections.css";

const ManageCollections = () => {

const { userData } = useUser();
const branchCode = userData?.branchCode;

const [collections,setCollections] = useState([]);
const [title,setTitle] = useState("");
const [imageFile,setImageFile] = useState(null);
const [preview,setPreview] = useState(null);

const fetchCollections = async ()=>{


if(!branchCode) return;

const snap = await getDocs(
  collection(db,`products/${branchCode}/collections`)
);

const data = snap.docs.map(d=>({
  id:d.id,
  ...d.data()
}));

setCollections(data);


};

useEffect(()=>{
fetchCollections();
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
  `collections/${branchCode}/${Date.now()}_${imageFile.name}`
);

await uploadBytes(storageRef,imageFile);

const imageUrl = await getDownloadURL(storageRef);

await addDoc(
  collection(db,`products/${branchCode}/collections`),
  {
    title,
    imageUrl,
    order:collections.length+1,
    active:true,
    createdAt:new Date()
  }
);

setTitle("");
setPreview(null);
setImageFile(null);

fetchCollections();


};

const handleDelete = async(id)=>{


await deleteDoc(
  doc(db,`products/${branchCode}/collections/${id}`)
);

fetchCollections();


};

return(


<div className="collection-page">

  <h2 className="page-title">Manage Collections</h2>

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
        placeholder="Collection Title"
        value={title}
        onChange={(e)=>setTitle(e.target.value)}
      />

      <button
        className="upload-btn"
        onClick={handleAdd}
      >
        Add Collection
      </button>

    </div>

    <div className="upload-right">

      {preview
        ? <img src={preview} className="preview-image" />
        : <div className="preview-placeholder">Preview</div>
      }

    </div>

  </div>

  <div className="collection-grid">

    {collections.map((col)=>(
      <div className="collection-card" key={col.id}>

        <img
          src={col.imageUrl}
          className="collection-image"
        />

        <div className="collection-info">

          <p>{col.title}</p>

          <button
            className="delete-btn"
            onClick={()=>handleDelete(col.id)}
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

export default ManageCollections;
