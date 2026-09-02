import { prepare as db } from './src/db/database.js';

const rows = db(
  `SELECT s.*, c.name AS class_name, c.annual_fee
   FROM students s JOIN parent_students ps ON ps.student_id = s.id
   JOIN classes c ON c.id = s.class_id
   WHERE ps.parent_id = ? AND s.status = 'active'`
).all(4);
console.log('rows:', rows.length);
console.log(JSON.stringify(rows[0], null, 2));
