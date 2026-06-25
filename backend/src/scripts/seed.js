// ─────────────────────────────────────────────────────────────
// CredChain — demo seed script   (run: `npm run seed` from /backend)
//
// Populates a rich, demo-ready dataset so no screen is ever empty on stage:
//   • 3 one-click demo accounts (student / issuer / employer)
//   • verified issuers for the public registry
//   • discoverable students with varied CredScores for talent search
//   • accepted credentials (mock-anchored) + a revoked one for the demo
//
// IDEMPOTENT: every seeded user uses the @credchain.demo email domain.
// On each run we delete those users and all docs that reference them,
// then recreate — so re-seeding never duplicates and never touches real data.
// ─────────────────────────────────────────────────────────────

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const User = require('../models/User');
const Credential = require('../models/Credential');
const StudentProfile = require('../models/StudentProfile');
const IssuerProfile = require('../models/IssuerProfile');
const EmployerProfile = require('../models/EmployerProfile');
const { recalculateCredScore, assignTier } = require('../utils/credScore');
const { computeCredentialHash } = require('../utils/hash');
const { mockMemoSignature } = require('../config/solana');

const DEMO_DOMAIN = '@credchain.demo';
const PASS = 'demo1234';

function ccId() {
  return `cc_${crypto.randomBytes(4).toString('hex')}`;
}
function pick(arr, i) {
  return arr[i % arr.length];
}

const SKILLS = [
  { category: 'Frontend', name: 'React.js', tags: ['React', 'JavaScript', 'Frontend'] },
  { category: 'Backend', name: 'Node.js', tags: ['Node.js', 'Express', 'Backend'] },
  { category: 'Data', name: 'Python Data Analysis', tags: ['Python', 'Pandas', 'Data'] },
  { category: 'Design', name: 'Product Design', tags: ['Figma', 'UI', 'UX'] },
  { category: 'Mobile', name: 'Flutter', tags: ['Flutter', 'Dart', 'Mobile'] },
  { category: 'Blockchain', name: 'Solana Development', tags: ['Solana', 'Rust', 'Web3'] },
  { category: 'Backend', name: 'Smart Contracts', tags: ['Solidity', 'Web3', 'Backend'] },
  { category: 'Data', name: 'Machine Learning', tags: ['Python', 'ML', 'TensorFlow'] },
];

const STUDENT_NAMES = [
  'Amara Okafor', 'Chidi Eze', 'Ngozi Bello', 'Tunde Adeyemi', 'Fatima Yusuf',
  'Emeka Nwosu', 'Aisha Mohammed', 'Kelechi Obi', 'Zainab Sani', 'Ifeoma Okeke',
  'Segun Bakare', 'Halima Abubakar', 'Chinwe Maduka',
];

const CITIES = [
  { city: 'Lagos', country: 'NG' }, { city: 'Abuja', country: 'NG' },
  { city: 'Enugu', country: 'NG' }, { city: 'Nairobi', country: 'KE' },
  { city: 'Accra', country: 'GH' },
];

const ISSUERS = [
  { name: 'University of Nigeria, Nsukka', domain: 'unn.edu.ng', type: 'university' },
  { name: 'Andela Talent Academy', domain: 'andela.demo', type: 'bootcamp' },
  { name: 'AltSchool Africa', domain: 'altschool.demo', type: 'bootcamp' },
  { name: 'Covenant University', domain: 'covenant.edu.ng', type: 'university' },
  { name: 'Paystack Engineering', domain: 'paystack.demo', type: 'company' },
  { name: 'Solana Foundation', domain: 'solana.demo', type: 'certifier' },
];

const TITLES = [
  'Frontend Engineering — Practitioner', 'Backend Engineering — Practitioner',
  'Data Analysis Certificate', 'Product Design Fundamentals', 'Mobile Development — Flutter',
  'Solana dApp Development', 'Cloud & DevOps Essentials', 'Machine Learning Foundations',
];

async function clearDemoData() {
  const demoUsers = await User.find({ email: new RegExp(`${DEMO_DOMAIN.replace('.', '\\.')}$`) }).select('_id');
  const ids = demoUsers.map((u) => u._id);
  if (ids.length) {
    await Promise.all([
      Credential.deleteMany({ $or: [{ studentId: { $in: ids } }, { issuerId: { $in: ids } }] }),
      StudentProfile.deleteMany({ userId: { $in: ids } }),
      IssuerProfile.deleteMany({ userId: { $in: ids } }),
      EmployerProfile.deleteMany({ userId: { $in: ids } }),
    ]);
    await User.deleteMany({ _id: { $in: ids } });
  }
  console.log(`[seed] cleared ${ids.length} previous demo users + dependents`);
}

async function makeUser(name, role, emailLocal) {
  const passwordHash = await bcrypt.hash(PASS, 10);
  return User.create({
    name,
    email: `${emailLocal}${DEMO_DOMAIN}`,
    passwordHash,
    role,
    credchainId: ccId(),
  });
}

// Create N accepted, mock-anchored credentials for a student from a given issuer.
async function issueAccepted(student, issuerUser, issuerLabel, count, startIdx) {
  const creds = [];
  for (let i = 0; i < count; i++) {
    const skill = pick(SKILLS, startIdx + i);
    const weight = 0.25 + ((startIdx + i) % 4) * 0.2; // 0.25..0.85
    const doc = new Credential({
      title: pick(TITLES, startIdx + i),
      issuer: issuerLabel,
      issuerId: issuerUser?._id,
      studentId: student._id,
      recipientEmail: student.email,
      status: 'accepted',
      skillCategory: skill.category,
      skillName: skill.name,
      skillTags: skill.tags,
      compositeWeight: weight,
      trustTier: assignTier(weight),
      deliveryCount: (startIdx + i) % 5,
    });
    doc.sha256Hash = computeCredentialHash(doc);
    doc.hash = doc.sha256Hash;
    const sig = mockMemoSignature(doc.sha256Hash);
    doc.solanaTxSignature = sig;
    doc.txSignature = sig;
    await doc.save();
    creds.push(doc);
  }
  return creds;
}

async function seedStudent(name, idx, issuerUser, issuerLabel) {
  const local = 'stu-' + name.toLowerCase().replace(/[^a-z]+/g, '.');
  const user = await makeUser(name, 'student', local);
  const credCount = 2 + (idx % 4); // 2..5
  const creds = await issueAccepted(user, issuerUser, issuerLabel, credCount, idx);

  const completed = 2 + (idx % 7);
  const loc = pick(CITIES, idx);
  const profile = await StudentProfile.create({
    userId: user._id,
    verifiedSkills: creds.map((c) => c._id),
    academicStatus: idx % 3 === 0 ? 'nysc' : 'in_school',
    yearOfStudy: 1 + (idx % 5),
    university: pick(ISSUERS, idx).name,
    course: pick(SKILLS, idx).name,
    discoverable: true,
    location: loc,
    headline: `${pick(SKILLS, idx).category} talent · verified on CredChain`,
    deliveryStats: {
      total: completed + 1,
      completed,
      disputed: 0,
      confirmedAgainst: idx % 9 === 0 ? 1 : 0,
      totalEarnedSOL: Number((completed * 0.4).toFixed(2)),
    },
  });
  await recalculateCredScore(profile, creds);
  return { user, profile, creds };
}

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('[seed] MONGO_URI is not set in backend/.env');
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log('[seed] connected to MongoDB');

  await clearDemoData();

  // ── Verified issuers (for the public registry + minting) ──────────
  const issuerUsers = [];
  for (let i = 0; i < ISSUERS.length; i++) {
    const it = ISSUERS[i];
    const u = await makeUser(it.name, 'issuer', `iss-${it.domain.replace(/\./g, '-')}`);
    await IssuerProfile.create({
      userId: u._id,
      institutionType: it.type,
      lockedDomain: `${it.domain}-${i}`, // unique sparse domain per seeded issuer
      verificationStatus: 'active',
      isVerifiedIssuer: true,
      domainVerifiedAt: new Date(),
      kyc: { status: 'passed', checkedAt: new Date() },
      registry: { matched: true, reviewedBy: 'seed', reviewedAt: new Date() },
    });
    issuerUsers.push({ user: u, label: it.name });
  }
  console.log(`[seed] created ${issuerUsers.length} verified issuers`);

  // ── The 3 one-click demo accounts ─────────────────────────────────
  // Demo issuer: a real verified issuer that can mint live during the demo.
  const demoIssuer = await makeUser('Demo Issuer — UNN', 'issuer', 'demo-issuer');
  await IssuerProfile.create({
    userId: demoIssuer._id,
    institutionType: 'university',
    lockedDomain: 'demo-unn.edu.ng',
    verificationStatus: 'active',
    isVerifiedIssuer: true,
    domainVerifiedAt: new Date(),
    kyc: { status: 'passed', checkedAt: new Date() },
    registry: { matched: true, reviewedBy: 'seed', reviewedAt: new Date() },
  });

  // Demo employer.
  const demoEmployer = await makeUser('Demo Employer — Paystack', 'employer', 'demo-employer');
  await EmployerProfile.create({ userId: demoEmployer._id, companyName: 'Paystack', chatCreditsRemaining: 50 });

  // Demo student: rich, populated portfolio + one revoked credential.
  const demoStudent = await makeUser('Amara Okafor', 'student', 'demo-student');
  const demoCreds = await issueAccepted(demoStudent, demoIssuer, 'University of Nigeria, Nsukka', 5, 0);
  // a revoked credential for the demo
  const revoked = new Credential({
    title: 'Outdated Certificate (revoked)',
    issuer: 'University of Nigeria, Nsukka',
    issuerId: demoIssuer._id,
    studentId: demoStudent._id,
    recipientEmail: demoStudent.email,
    status: 'revoked',
    skillCategory: 'Other',
    skillName: 'Legacy Skill',
    skillTags: ['Legacy'],
    compositeWeight: 0.2,
    trustTier: 'learner',
  });
  revoked.sha256Hash = computeCredentialHash(revoked);
  revoked.hash = revoked.sha256Hash;
  revoked.revokedHash = `${revoked.sha256Hash}:REVOKED`;
  revoked.revokedTxSignature = mockMemoSignature(revoked.revokedHash);
  revoked.revokedAt = new Date();
  await revoked.save();

  const demoProfile = await StudentProfile.create({
    userId: demoStudent._id,
    verifiedSkills: demoCreds.map((c) => c._id),
    academicStatus: 'in_school',
    yearOfStudy: 3,
    university: 'University of Nigeria, Nsukka',
    course: 'Computer Science',
    discoverable: true,
    location: { city: 'Enugu', country: 'NG' },
    headline: 'Full-stack & Solana developer · verified on CredChain',
    deliveryStats: { total: 8, completed: 7, disputed: 0, confirmedAgainst: 0, totalEarnedSOL: 3.2 },
    sandboxSkills: [
      { skillName: 'Open-source contributions', source: 'GitHub', link: 'https://github.com' },
      { skillName: 'Technical writing', source: 'Self-taught' },
    ],
  });
  await recalculateCredScore(demoProfile, demoCreds);
  console.log('[seed] created 3 demo accounts (student/issuer/employer)');

  // ── Additional discoverable students for talent search ────────────
  for (let i = 0; i < STUDENT_NAMES.length; i++) {
    const issuer = pick(issuerUsers, i);
    await seedStudent(STUDENT_NAMES[i], i, issuer.user, issuer.label);
  }
  console.log(`[seed] created ${STUDENT_NAMES.length} additional students`);

  const totals = {
    users: await User.countDocuments({ email: new RegExp(`${DEMO_DOMAIN.replace('.', '\\.')}$`) }),
    credentials: await Credential.countDocuments({}),
  };
  console.log('\n[seed] ✅ done.');
  console.log('   Demo logins (password "demo1234" or the one-click buttons):');
  console.log('     • demo-student@credchain.demo');
  console.log('     • demo-issuer@credchain.demo');
  console.log('     • demo-employer@credchain.demo');
  console.log(`   Seeded demo users: ${totals.users}`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(async (err) => {
  console.error('[seed] failed:', err);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
