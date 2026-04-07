import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  // Admin user
  const adminPassword = await bcrypt.hash("Admin123!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@platform.lt" },
    update: {},
    create: {
      email: "admin@platform.lt",
      name: "Administratorius",
      password: adminPassword,
      role: "ADMIN",
    },
  });
  console.log("Admin created:", admin.email);

  // Providers
  const providerPassword = await bcrypt.hash("Provider123!", 12);
  const providers = await Promise.all([
    prisma.user.upsert({
      where: { email: "jonas@example.lt" },
      update: {},
      create: {
        email: "jonas@example.lt",
        name: "Jonas Jonaitis",
        password: providerPassword,
        role: "PROVIDER",
        providerProfile: {
          create: {
            description: "Patyręs santechnikas su 15 metų patirtimi. Atlieku visus santechnikos darbus kokybiškai ir greitai.",
            specializations: JSON.stringify(["santechnika", "statyba"]),
            location: "Vilnius",
            phone: "+37061234567",
            isActive: true,
            planType: "PRO",
            images: "[]",
          },
        },
      },
    }),
    prisma.user.upsert({
      where: { email: "petras@example.lt" },
      update: {},
      create: {
        email: "petras@example.lt",
        name: "Petras Petraitis",
        password: providerPassword,
        role: "PROVIDER",
        providerProfile: {
          create: {
            description: "Elektros darbų meistras. Atliekame elektros instaliacijos, remonto ir priežiūros darbus.",
            specializations: JSON.stringify(["elektra", "statyba"]),
            location: "Kaunas",
            phone: "+37062345678",
            isActive: true,
            planType: "BASIC",
            images: "[]",
          },
        },
      },
    }),
    prisma.user.upsert({
      where: { email: "ona@example.lt" },
      update: {},
      create: {
        email: "ona@example.lt",
        name: "Ona Onaitė",
        password: providerPassword,
        role: "PROVIDER",
        providerProfile: {
          create: {
            description: "Profesionalios valymo paslaugos namams ir biurams. Naudojame ekologiškas priemones.",
            specializations: JSON.stringify(["valymas"]),
            location: "Klaipėda",
            phone: "+37063456789",
            isActive: true,
            planType: "FREE",
            images: "[]",
          },
        },
      },
    }),
  ]);
  console.log("Providers created:", providers.length);

  // Service requests
  const requests = await Promise.all([
    prisma.serviceRequest.create({
      data: {
        title: "Reikia sutaisyti vandens čiaupą",
        description: "Virtuvėje laša čiaupas, reikia pakeisti arba sutaisyti. Namas yra centre.",
        category: "santechnika",
        location: "Vilnius",
        budget: "iki-100",
        status: "OPEN",
        clientEmail: "klientas1@example.lt",
        clientName: "Marius",
        trackingToken: crypto.randomBytes(32).toString("hex"),
      },
    }),
    prisma.serviceRequest.create({
      data: {
        title: "Elektros instaliacijos darbai naujame bute",
        description: "Naujas butas, reikia pilnos elektros instaliacijos. 3 kambariai, virtuvė, vonios kambarys.",
        category: "elektra",
        location: "Kaunas",
        budget: "1000-5000",
        status: "OPEN",
        clientEmail: "klientas2@example.lt",
        clientName: "Giedrė",
        trackingToken: crypto.randomBytes(32).toString("hex"),
      },
    }),
    prisma.serviceRequest.create({
      data: {
        title: "Biuro valymas kas savaitę",
        description: "Ieškome valymo paslaugų teikėjo biurui (~100 kv.m.). Valymas reikalingas kartą per savaitę.",
        category: "valymas",
        location: "Klaipėda",
        budget: "100-500",
        status: "OPEN",
        clientEmail: "klientas3@example.lt",
        clientName: "UAB Saulė",
        trackingToken: crypto.randomBytes(32).toString("hex"),
      },
    }),
    prisma.serviceRequest.create({
      data: {
        title: "Sodo tvarkymas ir gyvatvorės karpymas",
        description: "Reikia sutvarkyti 10 arų sodą: nupjauti žolę, apkarpyti gyvatvores, surinkti lapus.",
        category: "sodas",
        location: "Šiauliai",
        budget: "100-500",
        status: "OPEN",
        clientEmail: "klientas4@example.lt",
        clientName: "Antanas",
        trackingToken: crypto.randomBytes(32).toString("hex"),
      },
    }),
    prisma.serviceRequest.create({
      data: {
        title: "Svetainės sukūrimas mažam verslui",
        description: "Reikia sukurti modernią svetainę su kontaktų forma ir paslaugų aprašymais. Turime logotipą.",
        category: "it",
        location: "Visa Lietuva",
        budget: "500-1000",
        status: "OPEN",
        clientEmail: "klientas5@example.lt",
        clientName: "Indrė",
        trackingToken: crypto.randomBytes(32).toString("hex"),
      },
    }),
  ]);
  console.log("Service requests created:", requests.length);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
