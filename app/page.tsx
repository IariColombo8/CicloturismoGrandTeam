import Hero from "@/components/home/HeroSection"
import AboutTeam from "@/components/home/AboutTeam"
// import EventDetails from "@/components/home/EventDetails"
// import StatsCounter from "@/components/home/StatsCounter"
 import RouteMap from "@/components/home/RouteMap"
// import Testimonials from "@/components/home/Testimonials"
import Gallery from "@/components/home/Gallery"
import Sponsors from "@/components/home/Sponsors"
import CallToAction from "@/components/home/CallToAction"
import Navbar from "@/components/layout/Navbar"
import Footer from "@/components/layout/Footer"

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <AboutTeam />
      {/* <EventDetails /> */}
      {/* <StatsCounter /> */}
       <RouteMap /> 
      {/* <Testimonials /> */}
      <Gallery />
      <Sponsors />
      <CallToAction />
      <Footer />
    </main>
  )
}
