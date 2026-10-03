"use client";

import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import ChatRoom from "@/components/chat/ChatRoom";

export default function ChatView() {
  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 pb-[72px] md:pb-0">

      <main className="flex-1">
        <section className="px-4 sm:px-6 lg:px-8 py-10 mx-auto max-w-4xl w-full flex flex-col items-center">
          <div className="w-full mb-8 text-center">
            <p className="eyebrow mb-2">Real-time</p>
            <h1 className="serif-display text-4xl sm:text-5xl font-medium tracking-tight">
              Community chat
            </h1>
            <p className="text-[15px] text-text-secondary mt-3">
              Live disaster-response chat room. Sign in at the landing page to participate.
            </p>
          </div>

          <div className="w-full relative">
            <ChatRoom />
          </div>
        </section>
      </main>

      <Footer />
      </div>
    </div>
  );
}
