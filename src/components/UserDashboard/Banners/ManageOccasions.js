import React, { useEffect, useState } from "react";
import { collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../../firebaseConfig";
import { useUser } from "../../Auth/UserContext";
import "./ManageOccasions.css";

const ManageOccasions = () => {

const { userData } = useUser();
const branchCode = userData?.branchCode;

const [occasions,setOccasions] = useState([]);
const [title,setTitle] = useState("");
const [subtitle,setSubtitle] = useState("");
const [imageFile,setImageFile] = useState(null);
const [preview,setPreview] = useState(null);

const fetchOccasions = async()=>{

if(!branchCode) return;

const snap = await getDocs(
collection(db,`products/${branchCode}/occasions`)
);

const data = snap.docs.map(d=>({
id:d.id,
...d.data()
}));

setOccasions(data);
};

useEffect(()=>{
fetchOccasions();
},[branchCode]);

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

const handleAdd=async()=>{

if(!title || !imageFile){
alert("Fill all fields");
return;
}

const storageRef=ref(
storage,
`occasions/${branchCode}/${Date.now()}_${imageFile.name}`
);

await uploadBytes(storageRef,imageFile);

const imageUrl=await getDownloadURL(storageRef);

await addDoc(
collection(db,`products/${branchCode}/occasions`),
{
title,
subtitle,
imageUrl,
order:occasions.length+1,
active:true,
createdAt:new Date()
}
);

setTitle("");
setSubtitle("");
setImageFile(null);
setPreview(null);

fetchOccasions();
};

const handleDelete=async(id)=>{

await deleteDoc(
doc(db,`products/${branchCode}/occasions/${id}`)
);

fetchOccasions();
};

return(

<div className="occasion-page">

<h2>Manage Shop By Occasion</h2>

<div className="upload-card">

<label className="file-upload">

Select Image

<input type="file" onChange={handleImageChange}/>

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

<button onClick={handleAdd}>
Add Occasion
</button>

</div>

{preview && (

<div className="preview-box">
<img src={preview} alt="" />
</div>

)}

<div className="grid">

{occasions.map(item=>(

<div key={item.id} className="card">

<img src={item.imageUrl} alt="" />

<h4>{item.title}</h4>

<p>{item.subtitle}</p>

<button onClick={()=>handleDelete(item.id)}>
Delete </button>

</div>

))}

</div>

</div>
);
};

export default ManageOccasions;
