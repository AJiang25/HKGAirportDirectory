document.addEventListener('DOMContentLoaded', async function() {
    const elements = {
        date: document.getElementById('date'),
        switchElement: document.getElementById('arrival_departure'),
        information: document.getElementById('information'),
        arrivalText: document.getElementById('Arrival'),
        departureText: document.getElementById('Departure'),
        reloadButton: document.getElementById('reload'),
        searchInput: document.querySelector('input[type="text"]'),
        searchButton: document.querySelector('.Search'),
        resetButton: document.querySelector('.Reset'),
        flightContainer: document.getElementById('card-container')
    };

    function setDate() {
        const formattedDate = new Date().toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric' });
        elements.date.textContent = `Date: ${formattedDate}`;
    }

    function setDefaultDisplay() {
        elements.information.innerHTML = '<strong>Departure Information</strong> &nbsp;(Next Ten Flights)';
        elements.departureText.style.textDecoration = 'underline';
    }

    function updateDisplayInfo(isArrival, searchTerm = '') {
        const flightType = isArrival ? 'Arrival' : 'Departure';
        elements.information.innerHTML = `<strong>${flightType} Information</strong> &nbsp;${searchTerm ? `Search: ${searchTerm}` : '(Next Ten Flights)'}`;
        elements.departureText.style.textDecoration = isArrival ? 'none' : 'underline';
        elements.arrivalText.style.textDecoration = isArrival ? 'underline' : 'none';
    }

    // Button Functionality
    elements.reloadButton.addEventListener('click', function() {
        location.reload();
    });

    elements.searchButton.addEventListener('click', function(event) {
        event.preventDefault();
        const searchTerm = elements.searchInput.value.toLowerCase();
        if (searchTerm) {
            const isArrival = document.getElementById('arrival_departure').checked;
            searchFlights(searchTerm, isArrival);
        }
    });

    elements.resetButton.addEventListener('click', function(event) {
        event.preventDefault();
        elements.searchInput.value = '';
        const isArrival = document.getElementById('arrival_departure').checked;
        fetchFlightData(isArrival);
    });

    // Default Display
    async function fetchFlightData(isArrival) {
        const date = new Date().toLocaleDateString('en-CA');
        const url = `flight.php?date=${date}&lang=en&cargo=false&arrival=${isArrival}`;
        updateDisplayInfo(isArrival, '');

        try {
            var flightResponse = await fetch(url);
            var flightData = await flightResponse.json();
            var iataResponse = await fetch('iata.json');
            var iataData = await iataResponse.json();
            processFlightData(flightData, iataData, isArrival, false);
        } catch(error) {
            console.error('Error fetching flight data:', error);
        }    
    }

    // Custom Search for a specific location
    async function searchFlights(searchTerm, isArrival) {
        const date = new Date().toLocaleDateString('en-CA');
        const url = `flight.php?date=${date}&lang=en&cargo=false&arrival=${isArrival}`;
        updateDisplayInfo(isArrival, searchTerm);

        try {
            const flightResponse = await fetch(url);
            const flightData = await flightResponse.json();
            const iataResponse = await fetch('iata.json');
            const iataData = await iataResponse.json();
            let filteredFlights = [];

            flightData.forEach(Data => {
                let flights = [];
                Data.list.forEach(flight =>{
                    const location = isArrival ? flight.origin : flight.destination;
                    location.forEach(code => {
                        const airport = iataData.find(a => a.iata_code === code);
                        if (airport) {
                            if (airport.municipality.toLowerCase().includes(searchTerm) ||
                                airport.name.toLowerCase().includes(searchTerm) ||
                                airport.iata_code.toLowerCase().includes(searchTerm)) {
                                flights.push(flight);
                            }
                        }
                    });
                });
                filteredFlights.push({list: flights, date: Data.date});
            });
            processFlightData(filteredFlights, iataData, isArrival, true);
        } catch(error) {
            console.error('Error searching flight data:', error);
        }
    }
    
    // Helper function that processes the flight data
    function processFlightData(flightData, iataData, isArrival, isCustom) {
        const flightContainer = document.getElementById('card-container');
        flightContainer.innerHTML = '';

        // Get current time and date
        const now = new Date();
        const currentDate = now.toLocaleDateString('en-CA');
        const currentTime = now.toLocaleTimeString(navigator.language, {hour: '2-digit', minute:'2-digit', hour12: false});
        let upcomingFlights = [];

        flightData.forEach(Data => {
            Data.list.forEach(flight => {
                const flightDate = new Date(Data.date + 'T' + flight.time);
                const currentDateTime = new Date(currentDate + 'T' + currentTime);
                
                if (!isCustom && flightDate >= currentDateTime) {
                    upcomingFlights.push({flight, date: Data.date});
                } else if (isCustom) {
                    upcomingFlights.push({flight, date: Data.date});
                }
            });
        });

        // Sort the flights on the same day date and time & adds the later flights
        upcomingFlights.sort((a, b) => {
            if (a.date !== b.date) {
                return a.date.localeCompare(b.date);
            }
            return a.flight.time.localeCompare(b.flight.time);
        });

        // Create the cards for the next ten flights
        upcomingFlights.slice(0, 10).forEach((flight, index) => {
            const card = document.createElement('div');
            card.className = 'card';
            card.id = `card${index + 1}`;
            const airport = isArrival ? flight.flight.origin : flight.flight.destination;
            const airportName = airport ? getAirportName(airport, iataData) : 'N/A';
            const flightNumbers = flight.flight.flight.map(f => f.no).join(', ') || 'N/A';

            // Format the scheduled time to include date for delayed flights
            const scheduledDateTime = new Date(flight.date + 'T' + flight.flight.time);
            const currentDate = new Date().toLocaleDateString('en-CA');
            const formattedScheduledTime = scheduledDateTime.toLocaleDateString('en-CA') === currentDate
                ? flight.flight.time
                : `${flight.flight.time} (${scheduledDateTime.toLocaleDateString('en-CA')}) `;

            card.innerHTML = `
                <p><b class="airport-type">${isArrival ? 'Origin' : 'Destination'} (Airport):</b> ${airportName}</p>
                <p><b>Flight No.:</b> ${flightNumbers}</p>
                <p><b>Scheduled Time:</b> ${formattedScheduledTime}</p>
                <div class="desktop">
                    <span>
                        <b>${isArrival ? 'Parking Stand' : 'Terminal'}:</b> ${isArrival ? flight.flight.stand : flight.flight.terminal}
                        <b>${isArrival ? 'Hall' : 'Aisle'}:</b> ${isArrival ? flight.flight.hall : flight.flight.aisle}
                        <b>${isArrival ? 'Belt' : 'Gate'}:</b> ${isArrival ? flight.flight.baggage : flight.flight.gate}
                    </span>
                    <p><b>Status:</b> ${flight.flight.status}</p>
                </div>
            `;

            // Function to toggle mobile view content
            card.addEventListener('click', function() {
                if (window.innerWidth < 500 && window.getComputedStyle(card.querySelector('.desktop')).display === 'block') {
                    card.querySelector('.desktop').style.display = 'none';
                } else {
                    card.querySelector('.desktop').style.display = 'block';
                }
            });

            // Hide desktop view content on mobile
            window.addEventListener('resize', function() {
                if (window.innerWidth < 500) {
                    card.querySelector('.desktop').style.display = 'none';
                }
            });
            flightContainer.appendChild(card);
        });
    }

    // airportName function
    function getAirportName(iataCodes, iataData) {
        let airportNames = [];
        iataCodes.forEach(iataCode => {
            const airport = iataData.find(a => a.iata_code === iataCode);
            airportNames = airportNames.concat(airport ? `${airport.municipality} (${airport.name})` : iataCode);
        })
        return airportNames.join(', ');
    }
    
    // Update Text Information based on toggle switch
    elements.switchElement.addEventListener('change', function() {
        elements.searchInput.value = '';
        fetchFlightData(this.checked);
    });

    // Initial fetch of flight data
    function init() {
        setDate();
        setDefaultDisplay();
        fetchFlightData(false);
    }
    init();
});
