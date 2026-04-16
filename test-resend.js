const { Resend } = require('resend');

const resend = new Resend('re_TC7rAqPR_9uDgCN4oFsXZ1ucUB26dHqfL');

async function test() {
  console.log("Testing Resend API key...");
  const { data, error } = await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: ['test@example.com'], // using dummy email, should throw recipient error if key is valid but unverified
    subject: 'Test',
    html: '<p>test</p>'
  });
  
  if (error) {
    console.error("Resend Error:", JSON.stringify(error, null, 2));
  } else {
    console.log("Success:", JSON.stringify(data, null, 2));
  }
}

test();
