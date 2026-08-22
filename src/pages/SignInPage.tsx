import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { motion } from "framer-motion"
import { Eye, EyeOff, Fingerprint, ShieldCheck } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth, type UserRole } from "../lib/auth"

const companyDomain = (import.meta.env.VITE_COMPANY_EMAIL_DOMAIN ?? "dayflow.io").toLowerCase()
const schema = z.object({ identifier: z.string().trim().min(3, "Enter your company email or ID."), password: z.string().min(1, "Enter your password."), rememberDevice: z.boolean() })
type FormValues = z.infer<typeof schema>
const benefits = ["Simplified attendance", "Faster leave approvals", "Secure employee records", "Smarter HR operations"]

export default function SignInPage() {
  const { signIn, signInWithPasskey } = useAuth(); const navigate = useNavigate(); const [role,setRole]=useState<UserRole>("EMPLOYEE"); const [method,setMethod]=useState<"ID"|"EMAIL"|"BIOMETRICS">("ID"); const [showPassword,setShowPassword]=useState(false); const [serverError,setServerError]=useState(""); const [passkeyBusy,setPasskeyBusy]=useState(false)
  const { register,handleSubmit,formState:{errors,isSubmitting} }=useForm<FormValues>({resolver:zodResolver(schema),defaultValues:{identifier:"",password:"",rememberDevice:false}})
  async function submit(values:FormValues){setServerError("");if(method==="EMAIL"&&!values.identifier.toLowerCase().endsWith(`@${companyDomain}`)){setServerError(`Use your @${companyDomain} company email.`);return}try{const result=await signIn(values.identifier,values.password,values.rememberDevice,role);if(result.mfa){navigate(`/verify-otp?identifier=${encodeURIComponent(result.identifier)}&purpose=ADMIN_LOGIN`);return}navigate(role==="ADMIN_HR"?"/admin/dashboard":"/employee/dashboard")}catch(error){setServerError(error instanceof Error?error.message:"The provided credentials could not be verified.")}}
  async function passkey(){setServerError("");setPasskeyBusy(true);try{const user=await signInWithPasskey();if(!user.roles.includes(role))throw new Error("This account does not have permission to access the selected portal.");navigate(role==="ADMIN_HR"?"/admin/dashboard":"/employee/dashboard")}catch(error){setServerError(error instanceof Error?error.message:"Biometric verification failed.")}finally{setPasskeyBusy(false)}}
  return <main className="auth-layout">
    <motion.section className="auth-brand" initial={{opacity:0}} animate={{opacity:1}} aria-label="About Dayflow">
      <video className="auth-brand-video" autoPlay loop muted playsInline preload="auto" aria-label="Dayflow workplace animation">
        <source src="/dayflow-login.mp4" type="video/mp4" />
      </video>
      <div className="auth-brand-overlay" aria-hidden="true" />
      <div className="auth-logo"><span>D</span><strong>Dayflow</strong></div>
      <div className="auth-brand-copy"><h1>Every workday,<br/>perfectly aligned.</h1><p>One secure workspace for the people, details, and decisions that keep work moving.</p></div>
      <ul>{benefits.map(item=><li key={item}><ShieldCheck aria-hidden="true"/>{item}</li>)}</ul>
    </motion.section>
    <section className="auth-form-side">
      <header className="auth-mobile-brand"><div className="auth-logo"><span>D</span><strong>Dayflow</strong></div><p>Every workday, perfectly aligned.</p></header>
      <motion.div className="auth-form-wrap" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:.35}}>
        <div><h2>Welcome back</h2><p>Sign in securely to your Dayflow workspace.</p></div>
        <div className="auth-segments" aria-label="Select portal">{(["ADMIN_HR","EMPLOYEE"] as UserRole[]).map(value=><button type="button" aria-pressed={role===value} onClick={()=>{setRole(value);setServerError("")}} key={value}>{value==="ADMIN_HR"?"Admin/HR":"Employee"}</button>)}</div>
        <div className="auth-segments auth-methods" aria-label="Select sign-in method">{(["ID","EMAIL","BIOMETRICS"] as const).map(value=><button type="button" aria-pressed={method===value} onClick={()=>{setMethod(value);setServerError("")}} key={value}>{value==="EMAIL"?"Company Email":value[0]+value.slice(1).toLowerCase()}</button>)}</div>
        {method!=="BIOMETRICS"&&<form onSubmit={handleSubmit(submit)} noValidate>
          <label>{method==="EMAIL"?"Company email":role==="ADMIN_HR"?"Admin/HR ID":"Employee ID"}<input type={method==="EMAIL"?"email":"text"} autoComplete="username" aria-invalid={!!errors.identifier} {...register("identifier")}/>{errors.identifier&&<small role="alert">{errors.identifier.message}</small>}</label>
          <div className="auth-password-field"><label htmlFor="password">Password</label><div className="auth-password"><input id="password" type={showPassword?"text":"password"} autoComplete="current-password" aria-invalid={!!errors.password} {...register("password")}/><button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?"Hide password":"Show password"}>{showPassword?<EyeOff/>:<Eye/>}</button></div>{errors.password&&<small role="alert">{errors.password.message}</small>}</div>
          <div className="auth-form-meta"><label><input type="checkbox" {...register("rememberDevice")}/>Remember this device</label><Link to="/forgot-password">Forgot password?</Link></div>
          {serverError&&<p className="auth-error" role="alert">{serverError}</p>}
          <button className="auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting?"Signing in…":`Sign in as ${role==="ADMIN_HR"?"Admin/HR":"Employee"}`}</button>
        </form>}
        {method==="BIOMETRICS"&&<div className="auth-biometric"><Fingerprint aria-hidden="true"/><h3>Use this device’s passkey</h3><p>Your device may use fingerprint, Face ID, Windows Hello, or a secure PIN.</p><button className="auth-passkey" type="button" onClick={passkey} disabled={passkeyBusy}>{passkeyBusy?"Waiting for this device…":"Continue with fingerprint or Face ID"}</button><button type="button" className="auth-another" onClick={()=>setMethod("ID")}>Use another method</button><p className="auth-enrollment-help">First time? Sign in with your password, then open <strong>Security</strong> and choose <strong>Add a new passkey</strong>.</p></div>}
        {serverError&&method==="BIOMETRICS"&&<p className="auth-error" role="alert">{serverError}</p>}
        <p className="auth-biometric-note">Your fingerprint or face data remains securely on this device.</p>
        <nav className="auth-links" aria-label="Account help"><Link to="/activate">Activate employee account</Link><Link to="/support">Help and support</Link></nav>
      </motion.div>
    </section>
  </main>
}
