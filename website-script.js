// Replace this with your WhatsApp number including country code, digits only.
// Example for India: 919876543210
const WHATSAPP_NUMBER = "91XXXXXXXXXX";

document.getElementById("year").textContent = new Date().getFullYear();
const menuButton = document.querySelector(".menu");
const nav = document.getElementById("nav");
menuButton.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(open));
});
nav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
  nav.classList.remove("open");
  menuButton.setAttribute("aria-expanded", "false");
}));

document.getElementById("enquiry").addEventListener("submit", event => {
  event.preventDefault();
  if (WHATSAPP_NUMBER.includes("X")) {
    alert("Please add your WhatsApp number in script.js before using this form.");
    return;
  }
  const data = new FormData(event.currentTarget);
  const message = `Hello Idhayam Candles,\nName: ${data.get("name")}\nBusiness: ${data.get("business") || "Not provided"}\nProduct: ${data.get("product")}\nRequirement: ${data.get("message") || "Please share wholesale details."}`;
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
});
