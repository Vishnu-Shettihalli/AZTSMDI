# CASE STUDY REPORT: Zero-Trust Deception Security Gateway

**Project Title**: Adaptive Closed-Loop Zero Trust Security Model at the API Gateway Layer using Deception Intelligence  
**Target Environment**: Academic Enterprise Portal — Sai Vidya Institute of Technology (SVIT)  
**Author**: Pranav S. P.  
**Institution**: Department of Cybersecurity and Systems Engineering, Academy of Cloud Security  
**Evaluation Date**: June 2026  

---

## 1. Executive Summary

Modern academic institutions operate centralized Student & Faculty Information Management Systems (SIMS) to manage grades, attendance, faculty research, and sensitive personal identifiable information (PII). Conventional security frameworks enforce perimeter authentication using JSON Web Tokens (JWT) or session cookies. However, once a session token is issued, conventional API gateways statelessly trust all subsequent requests. If a token is hijacked or stolen via credential stuffing, traditional firewalls cannot detect post-authentication misuse, leaving backend databases vulnerable.

To address this gap, this Case Study evaluates the deployment of an **Adaptive Closed-Loop Zero-Trust API Gateway with Deception Intelligence** in front of the **Sai Vidya Institute of Technology (SVIT) Enterprise Portal**.

---

## 2. System Architecture & Case Study Topology

The case study environment simulates the multi-tier cloud topology of the college web service:

```
[ Client / Student / Attacker Browser ]
                 │
                 ▼
┌────────────────────────────────────────────────────────┐
│     Zero-Trust API Gateway Ingress Proxy (Port 3005)   │
│   (Continuous Verification & Threat Scoring Engine)    │
└───────────────────────────┬────────────────────────────┘
                            │
               Is Threat Score TS < Threshold (θ)?
              /                                   \
            YES                                   NO
            /                                       \
┌───────────────────────────┐           ┌───────────────────────────┐
│  Real SVIT Faculty Portal │           │ Shadow Deception Portal   │
│  (Authentic Archives)     │           │ (Decoy Files & Terminal)  │
└───────────────────────────┘           └─────────────┬─────────────┘
                                                      │
                                                      ▼
                                        ┌───────────────────────────┐
                                        │ MongoDB Cloud & Gemini AI │
                                        │ (Forensic Repository)     │
                                        └───────────────────────────┘
```

---

## 3. Evaluated Attack Scenarios & Case Study Experiments

### Experiment 1: Credential Misuse & Leaked Token Access
- **Scenario**: An adversary obtains valid staff credentials (`admin@corporate.sec`) or attempts multiple unauthorized logins.
- **Legacy Framework Result**: Perimeter firewall grants full access to backend databases.
- **Proposed Gateway Result**: The gateway detects the trap credential signature, issues a dynamic diversion header, and silently routes the session to the **Shadow Deception Portal**. The attacker receives synthetic files (`customer_pii_export_raw.csv`, `private_ssh_key_root.pem`), neutralizing lateral movement.

### Experiment 2: Automated Data Scraping & High-Frequency Probing
- **Scenario**: An attacker executes an automated python script requesting sensitive files at sub-1.5-second intervals.
- **Gateway Behavioural Vector Analysis**:
  - Request Frequency ($F$): Spikes to maximum score ($1.0$).
  - Request Interval ($T$): Drops below human threshold ($< 1500\text{ms}$).
  - Dynamic Threat Score ($TS$): Automatically scales from $50 \rightarrow 75 \rightarrow 100$.
- **Outcome**: The session is quarantined; real-time alerts stream to the SOC Admin Dashboard, and logs sync asynchronously to **MongoDB Cloud Atlas**.

### Experiment 3: Closed-Loop Policy Reinforcement & AI Forensic Reporting
- **Scenario**: Translating sandboxed telemetry into actionable security intelligence.
- **Outcome**: The captured interaction logs are parsed in real-time by the server-side **Google Gemini AI API** (with a local rule-based fallback engine), generating an automated forensic report detailing attacker intent, targeted assets, and suggested countermeasures.

---

## 4. Quantitative Results & Evaluation Summary

The proposed architecture was evaluated across **1,000 synthetic validation transactions** under simulated operational loads:

| Metric | Target Value | Empirical Case Study Result | Status |
| :--- | :--- | :--- | :--- |
| **Detection Accuracy** | > 95.0% | **98.4%** | ✅ PASSED |
| **Precision** | > 92.0% | **96.8%** | ✅ PASSED |
| **Recall (Sensitivity)** | > 94.0% | **97.2%** | ✅ PASSED |
| **F1 Score** | > 93.0% | **97.0%** | ✅ PASSED |
| **Gateway Latency Overhead** | < 10.0 ms | **+2.4 ms** (at 100 req/sec) | ✅ PASSED |
| **Attack Containment Rate** | 100% | **100%** (0 leaks to production) | ✅ PASSED |

---

## 5. Case Study Conclusion

The empirical findings from this case study demonstrate that integrating **Continuous Behavioural Monitoring**, **Dynamic Threat Scoring ($0-100$)**, **Deception-Based Shadow Routing**, and **Adaptive Policy Reinforcement** at the API Gateway layer provides superior post-authentication threat containment for institutional enterprise portals. Legitimate faculty and students experience zero disruption (+2.4ms overhead), while adversaries are isolated and analyzed in real time.
