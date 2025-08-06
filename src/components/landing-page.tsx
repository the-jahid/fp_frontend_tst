import { SignInButton, SignUpButton, SignOutButton } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Stethoscope, ChevronDown, HelpCircle, Activity, Heart, Brain, AlertTriangle, Menu, MessageSquare, LogOut } from 'lucide-react'
import { auth } from "@clerk/nextjs/server"
import Link from "next/link"

export default async function LandingPage() {
  const { userId } = await auth()
  const isLoggedIn = !!userId

  return (
    <div className="min-h-screen bg-[#212121] text-white">
      {/* Header */}
      <header className="flex justify-between items-center p-3 sm:p-4 lg:p-6 h-14 sm:h-16 lg:h-20 border-b border-gray-700">
        <div className="flex items-center gap-2 group cursor-pointer">
          <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 rounded-full bg-gray-800 border border-gray-600">
            <Stethoscope className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
            <span className="text-lg sm:text-xl font-semibold text-white">
              ECDS v5.0
            </span>
            <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 group-hover:rotate-180 transition-transform duration-300" />
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden sm:flex items-center gap-2 lg:gap-3">
          {isLoggedIn ? (
            // Logged in state - show Chat and Logout buttons
            <>
              <Link href="/chat">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 sm:px-4 lg:px-6 py-2 text-sm lg:text-base font-medium transition-all duration-300 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Chat
                </Button>
              </Link>

              <SignOutButton>
                <Button
                  variant="ghost"
                  className="text-white hover:bg-gray-700 rounded-lg px-3 sm:px-4 lg:px-6 py-2 text-sm lg:text-base border border-gray-600 hover:border-gray-500 transition-all duration-300 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </Button>
              </SignOutButton>
            </>
          ) : (
            // Not logged in state - show Login and Signup buttons
            <>
              <SignInButton mode="modal">
                <Button
                  variant="ghost"
                  className="text-white hover:bg-gray-700 rounded-lg px-3 sm:px-4 lg:px-6 py-2 text-sm lg:text-base border border-gray-600 hover:border-gray-500 transition-all duration-300"
                >
                  Log in
                </Button>
              </SignInButton>

              <SignUpButton mode="modal">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 sm:px-4 lg:px-6 py-2 text-sm lg:text-base font-medium transition-all duration-300">
                  Sign up for free
                </Button>
              </SignUpButton>
            </>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="rounded-lg hover:bg-gray-700 transition-all duration-300 border border-gray-600 hover:border-gray-500 w-8 h-8 lg:w-10 lg:h-10"
          >
            <HelpCircle className="w-4 h-4 lg:w-5 lg:h-5" />
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <div className="sm:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-lg hover:bg-gray-700 transition-all duration-300 border border-gray-600 hover:border-gray-500 w-8 h-8"
          >
            <Menu className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] sm:min-h-[calc(100vh-4rem)] lg:min-h-[calc(100vh-5rem)] px-3 sm:px-4 lg:px-8 py-6 sm:py-8 lg:py-12">
        <div className="w-full max-w-6xl">
          {/* Hero Section */}
          <div className="text-center mb-8 sm:mb-10 lg:mb-16">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-blue-900/20 border border-blue-500/30 mb-4 sm:mb-6">
              <Activity className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
              <span className="text-xs sm:text-sm text-blue-200">Emergency Clinical Decision Support</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-center mb-4 sm:mb-6 text-white leading-tight">
              ECDS v5.0
            </h1>

            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 mb-6 sm:mb-8 max-w-xs sm:max-w-lg md:max-w-2xl mx-auto leading-relaxed px-2">
              Comprehensive medical assessments for emergency clinical presentations
            </p>

            {/* Feature highlights */}
            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-2 sm:gap-3 lg:gap-4 mb-8 sm:mb-10 lg:mb-12 px-2">
              {[
                { icon: Heart, text: "Evidence-based assessments" },
                { icon: Brain, text: "Differential diagnosis" },
                { icon: AlertTriangle, text: "Critical action alerts" },
              ].map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 w-full sm:w-auto"
                >
                  <feature.icon className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400 flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-gray-300">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Input Area */}
          <div className="relative mb-6 sm:mb-8 px-2">
            <div className="relative">
              <Input
                placeholder="Describe patient presentation..."
                className="w-full bg-[#2f2f2f] border-gray-600 rounded-2xl sm:rounded-3xl py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-8 text-white placeholder-gray-400 text-base sm:text-lg lg:text-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                disabled
              />
            </div>
          </div>

          {/* Clinical Examples */}
          <div className="mb-8 sm:mb-10 lg:mb-12 px-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {[
                { icon: "🫀", text: "Chest pain assessment", desc: "45-year-old male with chest pain" },
                { icon: "🩺", text: "Abdominal evaluation", desc: "25-year-old with abdominal pain" },
                { icon: "🫁", text: "Respiratory distress", desc: "60-year-old with shortness of breath" },
                { icon: "🧠", text: "Neurological symptoms", desc: "30-year-old with severe headache" },
              ].map((item, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700 rounded-xl px-3 sm:px-4 lg:px-6 py-4 sm:py-6 text-sm lg:text-base transition-all duration-300 flex flex-col items-center gap-2 sm:gap-3 h-auto min-h-[120px] sm:min-h-[140px]"
                  disabled
                >
                  <span className="text-xl sm:text-2xl">{item.icon}</span>
                  <div className="text-center">
                    <div className="font-medium leading-tight mb-1">{item.text}</div>
                    <div className="text-xs text-gray-400 leading-tight">{item.desc}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center px-2">
            {isLoggedIn ? (
              // Logged in state - show "Go to Chat" button
              <Link href="/chat">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 sm:px-8 lg:px-12 py-3 sm:py-4 text-base sm:text-lg font-semibold transition-all duration-300 w-full sm:w-auto">
                  <span className="flex items-center justify-center gap-2">
                    <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                    Go to Chat
                  </span>
                </Button>
              </Link>
            ) : (
              // Not logged in state - show "Start Clinical Assessment" button
              <SignUpButton mode="modal">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 sm:px-8 lg:px-12 py-3 sm:py-4 text-base sm:text-lg font-semibold transition-all duration-300 w-full sm:w-auto">
                  <span className="flex items-center justify-center gap-2">
                    Start Clinical Assessment
                    <Stethoscope className="w-4 h-4 sm:w-5 sm:h-5" />
                  </span>
                </Button>
              </SignUpButton>
            )}
          </div>

          {/* Mobile Auth/Chat Buttons */}
          <div className="sm:hidden mt-6 px-2 space-y-3">
            {isLoggedIn ? (
              // Logged in mobile state
              <>
                <Link href="/chat">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 transition-all duration-300 flex items-center justify-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Chat
                  </Button>
                </Link>
                <SignOutButton>
                  <Button
                    variant="outline"
                    className="w-full text-white hover:bg-gray-700 rounded-lg py-3 border border-gray-600 hover:border-gray-500 transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </Button>
                </SignOutButton>
              </>
            ) : (
              // Not logged in mobile state
              <>
                <SignInButton mode="modal">
                  <Button
                    variant="outline"
                    className="w-full text-white hover:bg-gray-700 rounded-lg py-3 border border-gray-600 hover:border-gray-500 transition-all duration-300"
                  >
                    Log in
                  </Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 transition-all duration-300">
                    Sign up for free
                  </Button>
                </SignUpButton>
              </>
            )}
            <div className="text-center">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white transition-colors duration-300"
              >
                <HelpCircle className="w-4 h-4 mr-2" />
                Help & Support
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-gray-400 text-xs sm:text-sm lg:text-base pb-4 sm:pb-6 lg:pb-8 px-3 sm:px-4 border-t border-gray-700 pt-4 sm:pt-6">
        <div className="max-w-2xl mx-auto">
          <p className="leading-relaxed mb-2 sm:mb-3">
            By using ECDS v5.0, you agree to our{" "}
            <a href="#" className="underline hover:text-blue-400 transition-colors duration-200">
              Terms of Service
            </a>{" "}
            and have read our{" "}
            <a href="#" className="underline hover:text-blue-400 transition-colors duration-200">
              Privacy Policy
            </a>
            .
          </p>
          <p className="text-xs text-gray-500 leading-relaxed">
            For educational and clinical decision support purposes only. Always consult with qualified healthcare professionals.
          </p>
        </div>
      </footer>
    </div>
  )
}
