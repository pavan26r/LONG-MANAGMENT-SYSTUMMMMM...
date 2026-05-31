(async () => {
  const base = 'http://localhost:5000';
  const headersJson = { 'Content-Type': 'application/json' };

  const login = async (email, password) => {
    const r = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: headersJson, body: JSON.stringify({ email, password }) });
    const j = await r.json();
    if (!r.ok) throw new Error(`Login failed for ${email}: ${JSON.stringify(j)}`);
    return j.token;
  };

  try {
    console.log('1) Login borrower');
    const borrowerToken = await login('borrower@lms.com', 'Borrower@123');
    console.log(' borrower token OK');

    console.log('2) Check eligibility (BRE)');
    const dob = new Date(); dob.setFullYear(dob.getFullYear() - 30);
    const breResp = await fetch(`${base}/api/loans/check-eligibility`, { method: 'POST', headers: {...headersJson, Authorization: `Bearer ${borrowerToken}`}, body: JSON.stringify({ dateOfBirth: dob.toISOString().split('T')[0], monthlySalary: 50000, pan: 'ABCDE1234F', employmentMode: 'salaried' }) });
    const breJson = await breResp.json();
    console.log(' BRE:', breResp.status, breJson);
    if (!breResp.ok) throw new Error('BRE failed');

    console.log('3) Apply loan using existing sample salary slip file');
    // Use existing file in uploads folder
    const sampleFiles = await (await fetch(`${base}/uploads`)).text().catch(()=>null);
    // We know filename from repo; use the known file created earlier
    const filename = 'salary-slip-1780161598062-101741345.pdf';
    const salarySlipUrl = `${base}/uploads/${filename}`;

    const applyResp = await fetch(`${base}/api/loans/apply`, {
      method: 'POST',
      headers: {...headersJson, Authorization: `Bearer ${borrowerToken}`},
      body: JSON.stringify({
        fullName: 'Test Borrower', pan: 'ABCDE1234F', dateOfBirth: dob.toISOString().split('T')[0], monthlySalary: 50000, employmentMode: 'salaried',
        salarySlipUrl, salarySlipOriginalName: filename,
        principalAmount: 100000, tenure: 90
      })
    });
    const applyJson = await applyResp.json();
    console.log(' APPLY:', applyResp.status, applyJson);
    if (!applyResp.ok) throw new Error('Apply failed');
    const loanId = applyJson.loan._id;

    console.log('4) Login sanction user and approve');
    const sanctionToken = await login('sanction@lms.com', 'Sanction@123');
    const approveResp = await fetch(`${base}/api/dashboard/sanction/${loanId}/approve`, { method: 'POST', headers: { ...headersJson, Authorization: `Bearer ${sanctionToken}` } });
    console.log(' APPROVE status', approveResp.status, await approveResp.json());

    console.log('5) Login disbursement user and disburse');
    const disbToken = await login('disbursement@lms.com', 'Disbursement@123');
    const disbResp = await fetch(`${base}/api/dashboard/disbursement/${loanId}/disburse`, { method: 'POST', headers: { ...headersJson, Authorization: `Bearer ${disbToken}` } });
    console.log(' DISBURSE status', disbResp.status, await disbResp.json());

    console.log('6) Login collection user and record full payment');
    const collToken = await login('collection@lms.com', 'Collection@123');
    // Get loan details to know totalRepayment
    const loanDetailResp = await fetch(`${base}/api/dashboard/loan/${loanId}`, { headers: { Authorization: `Bearer ${collToken}` } });
    const loanDetail = await loanDetailResp.json();
    const total = loanDetail.loan.totalRepayment;

    const utr = `UTR${Date.now()}`;
    const payResp = await fetch(`${base}/api/payments`, { method: 'POST', headers: { ...headersJson, Authorization: `Bearer ${collToken}` }, body: JSON.stringify({ loanId, utrNumber: utr, amount: total, paymentDate: new Date().toISOString() }) });
    console.log(' PAYMENT status', payResp.status, await payResp.json());

    console.log('7) Verify loan is closed');
    const finalLoanResp = await fetch(`${base}/api/dashboard/loan/${loanId}`, { headers: { Authorization: `Bearer ${collToken}` } });
    console.log(' FINAL loan:', await finalLoanResp.json());

    console.log('\nSmoke test completed successfully');
  } catch (err) {
    console.error('Smoke test failed:', err);
    process.exitCode = 2;
  }
})();
