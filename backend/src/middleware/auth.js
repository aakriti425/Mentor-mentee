import jwt from "jsonwebtoken";
import { config } from "../config.js";

export function auth(req,res,next){
  const header=req.headers.authorization||"";
  const token=header.startsWith("Bearer ")?header.slice(7):null;
  if(!token)return res.status(401).json({message:"Authentication required"});
  try{req.user=jwt.verify(token,config.jwtSecret);next()}catch{return res.status(401).json({message:"Invalid or expired token"})}
}
export function requireAdmin(req,res,next){if(req.user?.role!=="admin")return res.status(403).json({message:"Admin access required"});next()}