// src/pages/LandingPage.js
import React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";

const LandingWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4rem;
`;

const Section = styled.section`
  padding: 4rem 2rem;
  background-color: ${(props) =>
    props.dark ? "var(--color-dark-bg)" : "var(--color-dark-surface)"};
`;

const HeroText = styled.h1`
  font-size: 3rem;
  text-align: center;
  margin-bottom: 1rem;
  @media (min-width: 768px) {
    font-size: 4rem;
  }
`;

const SubText = styled.p`
  font-size: 1.25rem;
  text-align: center;
  color: var(--color-text-muted);
  max-width: 56rem;
  margin: 0 auto 2rem;
`;

const CtaContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
`;

const FeaturesGrid = styled.div`
  display: grid;
  gap: 2rem;
  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const FeatureCard = styled.div`
  background-color: var(--color-dark-bg);
  padding: 2rem;
  border-radius: var(--border-radius-lg);
  text-align: center;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  border: 1px solid var(--color-dark-border);
`;

function LandingPage() {
  const features = [
    {
      title: "Dynamic NPCs",
      description:
        "Generate conversations that adapt to game events, character moods, and player choices.",
    },
    {
      title: "Easy Integration",
      description:
        "Designed with a clear API for seamless integration into your game development workflow.",
    },
    {
      title: "AI-Powered",
      description:
        "Leverage advanced LLMs to create dialogues that are both creative and coherent.",
    },
  ];

  return (
    <LandingWrapper>
      <Section dark>
        <HeroText>Bring Your Worlds to Life</HeroText>
        <SubText>
          Create dynamic, AI-generated dialogues for your video game NPCs with a
          simple and powerful API.
        </SubText>
        <CtaContainer>
          <Link to="/dialogue" className="btn btn-primary">
            Start Forging
          </Link>
          <Link to="/login" className="btn btn-secondary">
            Learn More
          </Link>
        </CtaContainer>
      </Section>

      <Section>
        <h2
          style={{
            fontSize: "2.5rem",
            textAlign: "center",
            marginBottom: "3rem",
          }}
        >
          Features at a Glance
        </h2>
        <FeaturesGrid>
          {features.map((feature, index) => (
            <FeatureCard key={index}>
              <h3 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
                {feature.title}
              </h3>
              <p style={{ color: "var(--color-text-muted)" }}>
                {feature.description}
              </p>
            </FeatureCard>
          ))}
        </FeaturesGrid>
      </Section>
    </LandingWrapper>
  );
}

export default LandingPage;
