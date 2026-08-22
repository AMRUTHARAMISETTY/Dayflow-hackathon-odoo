import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { motion } from "framer-motion"
import { Eye, EyeOff, Fingerprint, Moon, ShieldCheck, Sun } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../lib/auth"

const schema = z.object({ identifier: z.string().trim().min(3, "Enter your company email or Employee ID."), password: z.string().min(1, "Enter your password."), rememberDevice: z.boolean() })
type FormValues = z.infer<typeof schema>
const benefits = ["Simplified attendance", "Faster leave approvals", "Secure employee records", "Smarter HR operations"]

export default function SignInPage() {
  const { signIn, signInWithPasskey } = useAuth(); const navigate = useNavigate(); const [showPassword,setShowPassword]=useState(false); const [dark,setDark]=useState(false); const [serverError,setServerError]=useState(""); const [passkeyBusy,setPasskeyBusy]=useState(false)
  const { register,handleSubmit,formState:{errors,isSubmitting} }=useForm<FormValues>({resolver:zodResolver(schema),defaultValues:{identifier:"",password:"",rememberDevice:false}})
  async function submit(values:FormValues){setServerError("");try{const result=await signIn(values.identifier,values.password,values.rememberDevice);if(result.mfa){navigate(`/verify-otp?identifier=${encodeURIComponent(result.identifier)}&purpose=ADMIN_LOGIN`);return}navigate("/employee/dashboard")}catch(error){setServerError(error instanceof Error?error.message:"The provided credentials could not be verified.")}}
  async function passkey(){setServerError("");setPasskeyBusy(true);try{const user=await signInWithPasskey();navigate(user.roles.includes("ADMIN_HR")?"/admin/dashboard":"/employee/dashboard")}catch(error){setServerError(error instanceof Error?error.message:"Biometric verification failed.")}finally{setPasskeyBusy(false)}}
  function toggleTheme(){const next=!dark;setDark(next);document.documentElement.dataset.theme=next?"dark":"light"}

  return <main className="auth-layout">
    <motion.section className="auth-brand" initial={{opacity:0}} animate={{opacity:1}} aria-label="About Dayflow">
      <div className="auth-logo"><span>D</span><strong>Dayflow</strong></div>
      <div className="auth-brand-copy"><h1>Every workday,<br/>perfectly aligned.</h1><p>One secure workspace for the people, details, and decisions that keep work moving.</p></div>
      <img src="/images/dayflow-workplace.png" alt="A team collaborating in a modern workplace" />
      <ul>{benefits.map(item=><li key={item}><ShieldCheck aria-hidden="true"/>{item}</li>)}</ul>
    </motion.section>
    <section className="auth-form-side">
      <header className="auth-mobile-brand"><div className="auth-logo"><span>D</span><strong>Dayflow</strong></div><p>Every workday, perfectly aligned.</p></header>
      <button className="auth-theme" type="button" onClick={toggleTheme} aria-label={dark?"Use light mode":"Use dark mode"}>{dark?<Sun/>:<Moon/>}</button>
      <motion.div className="auth-form-wrap" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:.35}}>
        <div><h2>Welcome back</h2><p>Sign in securely to your Dayflow workspace.</p></div>
        <form onSubmit={handleSubmit(submit)} noValidate>
          <label>Company email or Employee ID<input autoComplete="username" aria-invalid={!!errors.identifier} {...register("identifier")}/>{errors.identifier&&<small role="alert">{errors.identifier.message}</small>}</label>
          <div className="auth-password-field"><label htmlFor="password">Password</label><div className="auth-password"><input id="password" type={showPassword?"text":"password"} autoComplete="current-password" aria-invalid={!!errors.password} {...register("password")}/><button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?"Hide password":"Show password"}>{showPassword?<EyeOff/>:<Eye/>}</button></div>{errors.password&&<small role="alert">{errors.password.message}</small>}</div>
          <div className="auth-form-meta"><label><input type="checkbox" {...register("rememberDevice")}/>Remember this device</label><Link to="/forgot-password">Forgot password?</Link></div>
          {serverError&&<p className="auth-error" role="alert">{serverError}</p>}
          <button className="auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting?"Signing in…":"Sign In"}</button>
        </form>
        <button className="auth-passkey" type="button" onClick={passkey} disabled={passkeyBusy}><Fingerprint aria-hidden="true"/>{passkeyBusy?"Waiting for this device…":"Sign in with fingerprint or Face ID"}</button>
        <p className="auth-biometric-note">Your biometric information remains securely on this device.</p>
        <nav className="auth-links" aria-label="Account help"><Link to="/activate">Activate employee account</Link><Link to="/support">Help and support</Link></nav>
      </motion.div>
    </section>
  </main>
}
