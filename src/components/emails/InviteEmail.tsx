import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface InviteEmailProps {
  studentName: string;
  roomName: string;
  seatNumber: string;
  inviteLink: string;
}

export const InviteEmail = ({
  studentName,
  roomName,
  seatNumber,
  inviteLink,
}: InviteEmailProps) => (
  <Html>
    <Head />
    <Preview>Join {roomName} on ReadingSpace</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={box}>
          <Heading style={h1}>Welcome to {roomName}</Heading>
          <Text style={paragraph}>
            Hi {studentName}, your membership has been confirmed for{" "}
            <b>{roomName}</b>.
          </Text>
          <Text style={paragraph}>
            Your assigned seat is <b>{seatNumber}</b>.
          </Text>
          <Section style={buttonContainer}>
            <Link style={button} href={inviteLink}>
              Activate Your Account
            </Link>
          </Section>
          <Text style={paragraph}>
            Download the ReadingSpace app and log in to track your attendance
            and view your subscription details.
          </Text>
          <Hr style={hr} />
          <Text style={footer}>
            ReadingSpace — The silent sanctuary for deep focus.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
};

const box = {
  padding: "0 48px",
};

const h1 = {
  color: "#0D2137",
  fontSize: "24px",
  fontWeight: "bold",
  textAlign: "center" as const,
  margin: "30px 0",
};

const paragraph = {
  color: "#444",
  fontSize: "16px",
  lineHeight: "26px",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "24px 0",
};

const button = {
  backgroundColor: "#0D2137",
  borderRadius: "12px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "16px 32px",
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 0",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
};
