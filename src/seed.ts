import { prisma } from "./lib/prisma";

const mockShipments = [
  {
    trackingNumber: "TRK123456789",
    origin: "Saint Louis, MO",
    destination: "Laredo, TX",
    weight: 1690,
    pieces: 8,
    currentStatus: "Delivered",
    company: "ABC Logistics Inc.",
    travelEvents: [
      {
        status: "Delivered",
        location: "Laredo, TX",
        description: "Arrived at customer location for delivery",
        timestamp: new Date("2025-07-17T03:54:00Z"),
        eventType: "delivered"
      },
      {
        status: "In Transit",
        location: "Austin, TX",
        description: "Package in transit to destination",
        timestamp: new Date("2025-07-16T23:20:00Z"),
        eventType: "in-transit"
      },
      {
        status: "Picked up",
        location: "Saint Louis, MO",
        description: "Package picked up from origin",
        timestamp: new Date("2025-07-08T02:47:00Z"),
        eventType: "picked-up"
      }
    ]
  },
  {
    trackingNumber: "TRK987654321",
    origin: "Houston, TX",
    destination: "Miami, FL",
    weight: 2450,
    pieces: 12,
    currentStatus: "In Transit",
    company: "Global Shipping Co.",
    travelEvents: [
      {
        status: "In Transit",
        location: "Jacksonville, FL",
        description: "Package is on the way to destination",
        timestamp: new Date("2025-07-28T13:30:00Z"),
        eventType: "in-transit"
      },
      {
        status: "In Transit",
        location: "Tallahassee, FL",
        description: "Package processed at sorting facility",
        timestamp: new Date("2025-07-27T06:45:00Z"),
        eventType: "in-transit"
      },
      {
        status: "Picked up",
        location: "Houston, TX",
        description: "Package picked up from origin",
        timestamp: new Date("2025-07-26T08:15:00Z"),
        eventType: "picked-up"
      }
    ]
  },
  {
    trackingNumber: "TRK555888999",
    origin: "Los Angeles, CA",
    destination: "Seattle, WA",
    weight: 850,
    pieces: 3,
    currentStatus: "Out for Delivery",
    company: "Pacific Express",
    travelEvents: [
      {
        status: "Out for Delivery",
        location: "Seattle, WA",
        description: "Package is out for delivery",
        timestamp: new Date("2025-07-29T07:30:00Z"),
        eventType: "in-transit"
      },
      {
        status: "In Transit",
        location: "Portland, OR",
        description: "Package arrived at delivery facility",
        timestamp: new Date("2025-07-28T22:15:00Z"),
        eventType: "in-transit"
      },
      {
        status: "Picked up",
        location: "Los Angeles, CA",
        description: "Package picked up from origin",
        timestamp: new Date("2025-07-27T16:30:00Z"),
        eventType: "picked-up"
      }
    ]
  },
  {
    trackingNumber: "TRK111222333",
    origin: "Chicago, IL",
    destination: "Boston, MA",
    weight: 3200,
    pieces: 15,
    currentStatus: "Exception",
    company: "Midwest Cargo",
    travelEvents: [
      {
        status: "Exception",
        location: "Cleveland, OH",
        description: "Delivery attempt failed - recipient not available",
        timestamp: new Date("2025-07-28T14:15:00Z"),
        eventType: "in-transit"
      },
      {
        status: "In Transit",
        location: "Cleveland, OH",
        description: "Package arrived at local facility",
        timestamp: new Date("2025-07-27T09:00:00Z"),
        eventType: "in-transit"
      },
      {
        status: "Picked up",
        location: "Chicago, IL",
        description: "Package picked up from origin",
        timestamp: new Date("2025-07-25T13:45:00Z"),
        eventType: "picked-up"
      }
    ]
  },
  {
    trackingNumber: "TRK777444111",
    origin: "Phoenix, AZ",
    destination: "Denver, CO",
    weight: 1250,
    pieces: 6,
    currentStatus: "Delivered",
    company: "Desert Freight",
    travelEvents: [
      {
        status: "Delivered",
        location: "Denver, CO",
        description: "Package delivered successfully",
        timestamp: new Date("2025-07-26T11:45:00Z"),
        eventType: "delivered"
      },
      {
        status: "Out for Delivery",
        location: "Denver, CO",
        description: "Package out for delivery",
        timestamp: new Date("2025-07-26T06:30:00Z"),
        eventType: "in-transit"
      },
      {
        status: "In Transit",
        location: "Albuquerque, NM",
        description: "Package in transit",
        timestamp: new Date("2025-07-24T20:20:00Z"),
        eventType: "in-transit"
      },
      {
        status: "Picked up",
        location: "Phoenix, AZ",
        description: "Package picked up from origin",
        timestamp: new Date("2025-07-23T15:10:00Z"),
        eventType: "picked-up"
      }
    ]
  }
];

async function seed() {
  try {
    console.log("🌱 Starting database seed...");

    // Clear existing data
    await prisma.travelEvent.deleteMany();
    await prisma.shipment.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();

    console.log("🗑️  Cleared existing data");

    // Create a seed organization
    const organization = await prisma.organization.create({
      data: {
        name: "Demo Logistics Company",
        slug: "demo-logistics",
        ownerUserId: "temp-owner-id", // We'll update this after creating the user
        plan: "free"
      }
    });

    // Create a seed user
    const user = await prisma.user.create({
      data: {
        email: "demo@example.com",
        passwordHash: "$2b$12$dummy.hash.for.demo.user.only", // Dummy hash
        organizationId: organization.id,
        role: "owner",
        displayName: "Demo User"
      }
    });

    // Update organization with the actual owner user ID
    await prisma.organization.update({
      where: { id: organization.id },
      data: { ownerUserId: user.id }
    });

    console.log("✅ Created demo organization and user");

    // Seed shipments with travel events
    for (const shipmentData of mockShipments) {
      const { travelEvents, ...shipment } = shipmentData;
      
      const createdShipment = await prisma.shipment.create({
        data: {
          ...shipment,
          organizationId: organization.id,
          createdByUserId: user.id,
          travelEvents: {
            create: travelEvents.map(event => ({
              ...event,
              createdByUserId: user.id
            }))
          }
        },
        include: {
          travelEvents: true
        }
      });

      console.log(`✅ Created shipment: ${createdShipment.trackingNumber} with ${createdShipment.travelEvents.length} events`);
    }

    console.log("🎉 Database seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seed().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { seed };