// Current year
document.getElementById("year").textContent =
    new Date().getFullYear();

// Mobile navigation
const menuBtn = document.getElementById("menuBtn");
const navbar = document.getElementById("navbar");

menuBtn.addEventListener("click", function () {
    navbar.classList.toggle("open");
});

navbar.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
        navbar.classList.remove("open");
    });
});

// Gallery filtering
const filterButtons = document.querySelectorAll(".filter");
const galleryItems = document.querySelectorAll(".gallery-item");

filterButtons.forEach(function (button) {
    button.addEventListener("click", function () {
        filterButtons.forEach(function (item) {
            item.classList.remove("active");
        });

        button.classList.add("active");

        const category = button.dataset.filter;

        galleryItems.forEach(function (item) {
            if (
                category === "all" ||
                item.dataset.category === category
            ) {
                item.classList.remove("hidden");
            } else {
                item.classList.add("hidden");
            }
        });
    });
});

// Demo booking form
const bookingForm = document.getElementById("bookingForm");

bookingForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const booking = {
        name: document.getElementById("customerName").value,
        phone: document.getElementById("customerPhone").value,
        service: document.getElementById("serviceType").value,
        date: document.getElementById("bookingDate").value,
        message: document.getElementById("customerMessage").value
    };

    // Save in this browser for demonstration only.
    const bookings = JSON.parse(
        localStorage.getItem("sarathanBookings") || "[]"
    );

    bookings.push(booking);

    localStorage.setItem(
        "sarathanBookings",
        JSON.stringify(bookings)
    );

    alert(
        "Thank you, " + booking.name + "!\n\n" +
        "Your demo booking has been saved in this browser.\n" +
        "Service: " + booking.service + "\n" +
        "Date: " + booking.date + "\n\n" +
        "This is a demonstration. The studio has not received your booking."
    );

    bookingForm.reset();
});

// WhatsApp button
// IMPORTANT: Replace this example with your real number.
// Use country code and digits only, e.g. 94771234567.
const WHATSAPP_NUMBER = "94776292002";

document.getElementById("whatsappBtn").addEventListener(
    "click",
    function (event) {
        event.preventDefault();

        if (WHATSAPP_NUMBER.includes("X")) {
            alert(
                "Please add your WhatsApp number in script.js first."
            );
            return;
        }

        const message =
            "Hello Sarathan Studio! I would like to ask about a photography booking.";

        const url =
            "https://wa.me/" + WHATSAPP_NUMBER +
            "?text=" + encodeURIComponent(message);

        window.open(url, "_blank");
    }
);
