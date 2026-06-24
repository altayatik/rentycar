# RentyCar Reference Data Sources

Research date: June 24, 2026.

## Airport Coverage

RentyCar treats a commercial airport as a passenger airport where a renter would reasonably expect scheduled airline service and airport rental-car operations. The seed set prioritizes:

- FAA commercial service and primary airport definitions, including hub categories.
- FAA Part 139 certificated airports, which identify airports serving scheduled and unscheduled air carrier aircraft.
- FAA Passenger Boarding and All-Cargo Data, which reports commercial-service hub size and enplanement categories.
- Transport Canada National Airports System airports, which include major Canadian airports and airports serving provincial or territorial capitals.
- Additional major Canadian scheduled-service airports where airport rental-car use is common.

Primary source links:

- FAA Airport Categories: https://www.faa.gov/airports/planning_capacity/categories
- FAA Part 139 Airport Certification Status List: https://www.faa.gov/airports/airport_safety/part139_cert/part_139_airport_certification_status_list
- FAA Passenger Boarding and All-Cargo Data: https://www.faa.gov/airports/planning_capacity/passenger_allcargo_stats/passenger
- Transport Canada National Airports System airport list: https://tc.canada.ca/en/aviation/operating-airports-aerodromes/list-airports-owned-transport-canada

Airport coordinates are rounded reference coordinates suitable for map/filter metadata, not navigation.

## Rental Companies

The rental-company list includes major airport rental brands in the United States and Canada, plus common off-airport, car-sharing, and peer-to-peer options that renters may encounter around airports.

The MVP keeps `traditional_rental`, `car_sharing`, and `peer_to_peer` as coarse categories. Main airport counter brands are sorted first.

## Vehicle Catalog

Vehicle makes and models were selected from common North American rental-fleet classes and public fleet/category pages from major rental brands. Rental companies typically advertise examples such as "or similar," so this catalog is only a lookup baseline. The product value should come from observed RentyCar reports, not from advertised fleet examples.

Primary source links:

- Hertz vehicle guide: https://www.hertz.com/us/en/vehicles
- Avis vehicle guide: https://www.avis.com/en/cars/vehicles/us
- Budget vehicle guide: https://www.budget.com/en/cars/vehicles/us

## Refresh Notes

Airport service, rental brands, and fleet availability change over time. Refresh this reference data periodically, especially after FAA annual enplanement releases, Transport Canada airport-list updates, and major rental fleet/category changes.
