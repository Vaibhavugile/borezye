import React, { useEffect, useState } from "react";
import { collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../../firebaseConfig";
import { useUser } from "../../Auth/UserContext";
import "./ManageSubCollections.css";

const ManageSubCollections = () => {

const { userData } = useUser();
const branchCode = userData?.branchCode;

const [collections,setCollections] = useState([]);
const [collectionId,setCollectionId] = useState("");

const [items,setItems] = useState([]);
const [title,setTitle] = useState("");
const [imageFile,setImageFile] = useState(null);
const [preview,setPreview] = useState(null);

/* ---------------- FETCH COLLECTIONS ---------------- */

const fetchCollections = async()=>{

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

/* ---------------- FETCH SUBCOLLECTIONS ---------------- */

const fetchItems = async()=>{

if(!branchCode || !collectionId) return;

const snap = await getDocs(
collection(db,`products/${branchCode}/collections/${collectionId}/subcollections`)
);

const data = snap.docs.map(d=>({
id:d.id,
...d.data()
}));

setItems(data);

};

useEffect(()=>{
fetchCollections();
},[branchCode]);

useEffect(()=>{
fetchItems();
},[collectionId]);

/* ---------------- IMAGE SELECT ---------------- */

const handleImageChange=(e)=>{

const file=e.target.files[0];

if(!file) return;

setImageFile(file);

const reader=new FileReader();

reader.onloadend=()=>{
setPreview(reader.result);
};

reader.readAsDataURL(file);
};

/* ---------------- ADD SUBCOLLECTION ---------------- */

const handleAdd=async()=>{

if(!title || !imageFile || !collectionId){
alert("Fill all fields");
return;
}

const storageRef=ref(
storage,
`subcollections/${branchCode}/${Date.now()}_${imageFile.name}`
);

await uploadBytes(storageRef,imageFile);

const imageUrl=await getDownloadURL(storageRef);

await addDoc(
collection(db,`products/${branchCode}/collections/${collectionId}/subcollections`),
{
title,
imageUrl,
createdAt:new Date()
}
);

setTitle("");
setImageFile(null);
setPreview(null);

fetchItems();
};

/* ---------------- DELETE ---------------- */

const handleDelete=async(id)=>{

await deleteDoc(
doc(db,`products/${branchCode}/collections/${collectionId}/subcollections/${id}`)
);

fetchItems();

};

return(

<div className="subcollection-page">

<h2>Manage Sub Collections</h2>

<div className="upload-card">

<select
value={collectionId}
onChange={(e)=>setCollectionId(e.target.value)}

>

<option value="">Select Collection</option>

{collections.map(col=>(

<option key={col.id} value={col.id}>
{col.title}
</option>
))}

</select>

<label className="file-upload">

Select Image

<input type="file" onChange={handleImageChange}/>

</label>

<input
type="text"
placeholder="Sub Collection Title"
value={title}
onChange={(e)=>setTitle(e.target.value)}
/>

<button onClick={handleAdd}>
Add Item
</button>

</div>

{preview && (

<div className="preview-box">
<img src={preview} />
</div>

)}

<div className="grid">

{items.map(item=>(

<div key={item.id} className="card">

<img src={item.imageUrl} alt="" />

<p>{item.title}</p>

<button onClick={()=>handleDelete(item.id)}>
Delete </button>

</div>

))}

</div>

</div>

);

};

export default ManageSubCollections;
