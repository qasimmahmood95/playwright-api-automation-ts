import { faker } from '@faker-js/faker';
import { Booking } from '../schemas/booking.schema';

/**
 * Seed control: set FAKER_SEED for fully reproducible data; otherwise each run
 * is unique (unique names keep filter tests deterministic on the shared public
 * API). The seed in use is attached to every test as an annotation (see
 * src/fixtures.ts), so any failure can be replayed with
 * `FAKER_SEED=<seed> npm test`.
 */
export const fakerSeed = process.env.FAKER_SEED ? Number(process.env.FAKER_SEED) : Date.now();
faker.seed(fakerSeed);

const DAY_MS = 24 * 60 * 60 * 1000;

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Builds a valid booking with future dates; override any field per test. */
export function buildBooking(overrides: Partial<Booking> = {}): Booking {
  const checkin = faker.date.soon({ days: 30 });
  const nights = faker.number.int({ min: 1, max: 14 });
  const checkout = new Date(checkin.getTime() + nights * DAY_MS);

  return {
    firstname: faker.person.firstName(),
    lastname: faker.person.lastName(),
    totalprice: faker.number.int({ min: 50, max: 5000 }),
    depositpaid: faker.datatype.boolean(),
    bookingdates: {
      checkin: toIsoDate(checkin),
      checkout: toIsoDate(checkout),
    },
    additionalneeds: faker.helpers.arrayElement(['Breakfast', 'Late checkout', 'Extra pillows']),
    ...overrides,
  };
}
