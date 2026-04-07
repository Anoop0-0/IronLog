import Navbar from "./Navbar";

export default function AppLayout({children}){
    return(
         <div className="min-h-screen bg-gray-950 text-white">
      <main className="pb-20 max-w-lg mx-auto">
        {children}
      </main>
      <Navbar />
    </div>
    )
}
