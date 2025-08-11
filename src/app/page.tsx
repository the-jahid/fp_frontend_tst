import LandingPage from "@/components/landing-page";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {

  const {userId} = await auth()

  if(userId) {
    redirect('/chat')
  }

  return  <LandingPage /> ;
}


