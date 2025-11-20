"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { signIn } from "@/lib/actions/auth.action"

import {
  Form
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { toast } from "sonner"
import MyFormField from "@/components/MyFormField"
import { createUserWithEmailAndPassword, signInWithEmailAndPassword  } from "firebase/auth"
import { auth } from "@/firebase/client"
import { signUp } from "@/lib/actions/auth.action"
import { sign } from "crypto"



const formSchema = z.object({
    username: z.string().min(2).max(50),
})

const AuthFormSchema = (type: FormType) => {
    return z.object({
        name: type === "sign-up" ? z.string().min(3) : z.string().optional(),
        email: z.string().email(),
        password: z.string().min(6),
    })
}

const AuthForm = ({ type }:{ type: FormType}) => {
    const router = useRouter();
    const formSchema = AuthFormSchema(type);
     // 1. Define your form.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  })
 
  // 2. Define a submit handler.
  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
        if (type === "sign-up") {
            const { name, email, password } = values;

            const userCredentials = await createUserWithEmailAndPassword(auth, email, password);
            const result = await signUp({
                uid: userCredentials.user.uid,
                name: name!,
                email,
                password,
            });

            if (!result?.success) {
                toast.error(result.message);
                return;
            }
            toast.success("Account created successfully! Please sign in.");
            router.push('/sign-in')
        } else {

            const { email, password } = values;
            const userCredentials = await signInWithEmailAndPassword(auth, email, password);
            const idToken = await userCredentials.user.getIdToken();
            if (!idToken) {
                toast.error("Sign in failed.");
                return;
            }
            await signIn({
                email,
                idToken
            });

            toast.success("Signed in successfully!");
            router.push('/');
        }
    } catch (error) {
        console.log(error);
        toast.error("Something went wrong. Please try again.")  ;
    }
  }

  const isSignIn = type === "sign-in"
  const isSignUp = type === "sign-up"

  return (
    <div className="card-border lg:min-w-[566px]">
        <div className="flex flex-col gap-6 card py-14 px-10">
            <div className="flex flex-row gap-2 justify-center">
                <h2 className="text-primary-100">MockMate</h2>
            </div>
            <h3>Practice job interview with AI</h3>
        
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-6 mt-4 form">
        
        {!isSignIn && (
          <MyFormField 
          control={form.control} 
          name="name" 
          label="Name" 
          placeholder="Your Name" />
        )}
        <MyFormField 
          control={form.control} 
          name="email" 
          label="Email" 
          placeholder="Your email address"
          type="email" />

        <MyFormField 
          control={form.control} 
          name="password" 
          label="Password" 
          placeholder="Your Password"
          type="password" />

        <Button className="btn" type="submit">
            {isSignIn ? 'Sign in': 'Create an Account'}</Button>
      </form>
    </Form>

    <p className="text-center">
        {isSignIn ? "Don't have an account? " : "Already have an account? "}
        <Link href={!isSignIn ? '/sign-in' : '/sign-up'} className="font-bold text-user-primary ml-1">
        {isSignIn ? 'Sign up' : 'Sign in'}
        </Link>
    </p>
    </div>
    </div>
  )
}

export default AuthForm