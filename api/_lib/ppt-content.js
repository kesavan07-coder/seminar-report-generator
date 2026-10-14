/**
 * AI PowerPoint Content Generator & Multi-Template Synthesis Engine
 * Supports:
 * 1. Template 1 (template-academic-flowchart): Master format with Times New Roman,
 *    Wingdings square bullets (❑), topic-specific vertical connected flowchart (#4F81BD),
 *    and full-slide academic content distribution (zero excessive whitespace).
 * 2. Template 2 (template-executive-grid): Modern executive format with high-impact
 *    concept callout banner, 3-column technical parameter table, numbered process
 *    flow with decision branching, and 3-pillar Best Practices / Applications cards.
 */

'use strict';

function toUpperCaseTitle(topic) {
  let clean = String(topic || 'SEMINAR TOPIC').trim().toUpperCase();
  clean = clean.replace(/[\s:]+$/, '');
  return `${clean} :`;
}

function toHeadlineTitle(topic) {
  let clean = String(topic || 'Seminar Topic').trim();
  clean = clean.replace(/[\s:]+$/, '');
  return `${clean} :`;
}

/**
 * Synthesize complete presentation deck for the specified template
 */
function synthesizeTopicDeck(topic, subject = '', reportContent = null, templateId = 'template-academic-flowchart') {
  const cleanTemplateId = (templateId === 'template-executive-grid') 
    ? 'template-executive-grid' 
    : 'template-academic-flowchart';

  const t = (topic + ' ' + subject).toLowerCase();
  const mainTitle = toUpperCaseTitle(topic);
  const headlineTitle = toHeadlineTitle(topic);

  if (cleanTemplateId === 'template-executive-grid') {
    return synthesizeTemplate2Deck(topic, subject, t, headlineTitle, reportContent);
  } else {
    return synthesizeTemplate1Deck(topic, subject, t, mainTitle, reportContent);
  }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * TEMPLATE 1: Classic Academic Seminar (Flowchart & Square Bullets)
 * ─────────────────────────────────────────────────────────────────────────────
 */
function synthesizeTemplate1Deck(topic, subject, t, mainTitle, reportContent) {
  // Default general engineering content with 6-7 rich, 2-line bullets
  let overviewSubtitle = `${topic} provides a structured engineering paradigm to analyze, optimize, and execute complex technical workflows :`;

  let overviewBullets = [
    `A core foundation represents the fundamental theoretical and practical mechanisms used to govern ${topic} within complex modern computational systems.`,
    `In production architectures, structured models decouple execution pipelines from peripheral interfaces, organizing operations around measurable performance metrics.`,
    `The operational framework captures and normalizes telemetry, system state, and transactional loads across distributed components with strict deterministic validation.`,
    `Multidimensional analysis supports end-to-end observability, enabling engineers to compare execution throughput, latency bounds, and error distributions across active nodes.`,
    `Computational workflows can be inspected at granular levels of detail through hierarchical drill-down, telemetry filtering, and automated anomaly diagnostics.`,
    `In automated optimization, historical execution patterns identify latent bottlenecks, systemic correlations, and resource trends across high-throughput datasets.`,
    `Adopting standardized engineering protocols improves operational predictability, system resilience, and decision automation across mission-critical enterprise environments.`
  ];

  let introBullets = [
    `${topic} has emerged as a cornerstone discipline in modern computing, systems engineering, and distributed digital infrastructure.`,
    `Traditional methodologies struggle with exponential workload growth, monolithic dependencies, architectural fragility, and non-deterministic execution paths.`,
    `The architectural foundation provides a multidimensional structure wherein operational telemetry and functional parameters are systematically categorized.`,
    `Core operational dimensions include Processing Concurrency, Memory Footprint, Network Latency, State Consistency, and Fault Tolerance.`,
    `The central operational measurements, referred to as core performance indicators, quantify computational overhead, throughput capacity, and execution cost.`,
    `A robust engineering model commonly pairs a high-performance execution engine with dedicated validation, monitoring, and recovery subsystems.`,
    `Systematic parameter tracking provides deep contextual visibility, enabling operators and autonomous controllers to evaluate performance anomalies in real time.`,
    `Empirical evaluations confirm that modular decomposition eliminates single points of failure while optimizing hardware utilization and cache efficiency.`,
    `Continuous analysis enables proactive self-healing, automated load rebalancing, and compliance auditing across heterogeneous enterprise deployments.`
  ];

  let flowSteps = [
    'DATA & REQUIREMENT\nINGESTION',
    'PREPROCESSING &\nNORMALIZATION',
    'CORE COMPUTATIONAL\nPROCESSING',
    'PERFORMANCE &\nMETRIC ANALYSIS',
    'ANOMALY DETECTION &\nOPTIMIZATION',
    'OPERATIONAL\nDEPLOYMENT'
  ];

  let flowExplanation = [
    `Data Ingestion – Collects heterogeneous telemetry, raw sensor streams, or transactional event logs from distributed network endpoints.`,
    `Preprocessing & Normalization – Validates syntactic integrity, strips noise, transforms payloads, and loads sanitized records into staging buffers.`,
    `Core Processing – Executes domain-specific algorithmic pipelines, deterministic state transitions, and business rule evaluation engines.`,
    `Performance Analysis – Evaluates transaction throughput, processing latency, and computational resource consumption against benchmark thresholds.`,
    `Optimization & Recovery – Detects performance anomalies, applies automated self-healing routines, and optimizes execution schedules dynamically.`,
    `Operational Deployment – Commits verified state transitions to production data stores and delivers actionable insights to monitoring dashboards.`
  ];

  let conclBullets = [
    `${topic} establishes an indispensable architectural framework for engineering scalable, deterministic, and highly resilient computational platforms.`,
    `Decomposing complex workflows into modular processing stages eliminates single points of failure and maximizes system availability under heavy concurrency.`,
    `Structured parameter tracking provides multi-dimensional visibility, enabling operators to analyze performance, latency, and resource utilization in real time.`,
    `Multilevel operational controls allow granular diagnostic drill-downs, proactive bottleneck mitigation, and automated load rebalancing across nodes.`,
    `Continuous telemetry analysis leverages historical execution patterns to optimize resource allocation and prevent service degradations before they manifest.`,
    `A well-engineered operational architecture significantly reduces infrastructure overhead, optimizes hardware utilization, and ensures strict SLA compliance.`,
    `Empirical benchmarking and real-world case studies demonstrate marked superiority over conventional monolithic designs in throughput and reliability.`,
    `Overall, adopting this standardized paradigm transforms complex technical operations into predictable, high-performance, and verifiable enterprise assets.`
  ];

  // Domain-specific customization for Template 1
  if (t.includes('data warehousing') || t.includes('dimensional space') || t.includes('data mining') || t.includes('olap')) {
    overviewSubtitle = 'Dimensional Space represents data using multiple dimensions or attributes so that complex business information can be analyzed from different perspectives :';
    overviewBullets = [
      'A dimension represents a perspective or characteristic used to analyze data, such as Time, Product, Customer, Location, or Department.',
      'In a data warehouse, dimensional models organize data around measurable business facts and descriptive dimensions.',
      'A fact table stores numerical measures such as sales amount, quantity, profit, or cost, while dimension tables provide descriptive details.',
      'Dimensional space supports multidimensional analysis such as comparing sales by product, region, customer, and time.',
      'Data can be viewed at different levels of detail through operations such as drill-down, roll-up, slice, and dice.',
      'In data mining, dimensional information helps identify patterns, relationships, trends, groups, and useful knowledge from large datasets.',
      'It improves analytical queries, reporting, decision-making, and business intelligence by providing a structured view of data.'
    ];
    introBullets = [
      'Data Warehousing is the process of collecting, integrating, storing, and organizing data from multiple sources into a centralized analytical repository.',
      'Data Mining is the process of discovering useful patterns, relationships, trends, anomalies, and insights from large volumes of structured and unstructured data.',
      'Dimensional Space provides a multidimensional structure in which business data can be modeled, queried, and visualized from multiple perspectives.',
      'Common dimensions include Time, Product, Customer, Geography, Supplier, and Department, which provide rich contextual attributes for numerical metrics.',
      'The central business measurements are called facts or measures, such as revenue, transaction count, profit margin, operational cost, and units sold.',
      'A dimensional model commonly contains a Fact Table connected to several Dimension Tables in Star, Snowflake, or Fact Constellation schema topologies.',
      'Dimensions provide context to numerical measures and allow business analysts to navigate seamlessly between high-level summaries and atomic details.',
      'For example, total sales can be analyzed across calendar years, fiscal quarters, retail categories, customer tiers, and regional territories simultaneously.',
      'Dimensional analysis is fundamental for executive dashboards, OLAP cubes, business intelligence reporting, and advanced predictive data science algorithms.'
    ];
    flowSteps = [
      'DATA SOURCES',
      'ETL / DATA\nPREPARATION',
      'FACT & DIMENSION\nTABLES',
      'MULTIDIMENSIONAL\nANALYSIS',
      'DATA MINING',
      'BUSINESS\nINSIGHTS'
    ];
    flowExplanation = [
      'Data Sources – Collect data from operational databases, enterprise applications, flat files, transaction logs, and external APIs.',
      'ETL / Data Preparation – Extract, clean, transform, validate, and load raw transactional data into the staging and analytical data warehouse environment.',
      'Fact & Dimension Tables – Store measurable numerical business facts alongside descriptive dimension tables in optimized Star or Snowflake schemas.',
      'Multidimensional Analysis – Analyze business facts across dimensions such as time, product lines, regional markets, customer demographics, and channels.',
      'OLAP Operations – Utilize slice, dice, drill-down, roll-up, and pivot operations to inspect data at atomic, intermediate, and executive aggregate levels.',
      'Data Mining – Apply classification, clustering, regression, and association rule algorithms to extract actionable patterns and predictive models.',
      'Business Insights – Convert analytical findings into executive intelligence, strategic KPIs, competitive insights, and automated decision-making.'
    ];
    conclBullets = [
      'Dimensional Space provides a structured, mathematically sound way to represent and analyze complex multidimensional enterprise data.',
      'Data Warehousing uses dimensional schemas to organize numerical facts alongside descriptive context, optimizing both query speed and intuitive reporting.',
      'Core business dimensions such as Time, Product, Customer, and Geography provide diverse viewpoints for evaluating organizational performance and growth.',
      'Multidimensional OLAP operations like slice, dice, drill-down, and roll-up empower analysts to explore data interactively without custom database queries.',
      'Data Mining algorithms utilize normalized dimensional data structures to discover hidden correlations, market trends, customer clusters, and predictive signals.',
      'A rigorously designed dimensional warehouse drastically reduces computational query latencies, index overhead, and storage fragmentation.',
      'Dimensional Space remains the foundational architectural pillar for modern Cloud Data Lakes, Real-Time Business Intelligence, and AI Analytics.',
      'Overall, it bridges the gap between raw enterprise transactions and informed strategic decisions, transforming data into competitive advantage.'
    ];
  } else if (t.includes('healthcare') || t.includes('medical') || (t.includes('artificial intelligence') && t.includes('health')) || t.includes('clinical')) {
    overviewSubtitle = 'Artificial Intelligence integrates deep neural networks and multimodal clinical telemetry to optimize patient diagnostics and clinical workflows :';
    overviewBullets = [
      'Clinical imaging algorithms analyze high-resolution MRI, CT, and histopathological scans to detect oncological and radiological anomalies with expert precision.',
      'Electronic Health Record (EHR) pipelines leverage transformer-based NLP architectures to extract clinical entities and predict adverse patient trajectories.',
      'Continuous ICU telemetry monitors physiological vitals in real time, feeding predictive risk stratification models for early sepsis and cardiac intervention.',
      'High-throughput genomic sequencing pipelines utilize deep learning for rapid variant pathogenicity classification and personalized therapeutic matching.',
      'Automated clinical decision support systems reduce diagnostic latency, cross-reference pharmacology databases, and prevent adverse drug interactions.',
      'Privacy-preserving federated learning paradigms enable secure multi-institutional model training without exposing sensitive patient health records.',
      'Rigorous clinical benchmarking and algorithmic auditing ensure compliance with medical regulatory frameworks (FDA, HIPAA) and ethical safety standards.'
    ];
    introBullets = [
      'Healthcare AI combines statistical pattern recognition, deep neural networks, and clinical knowledge graphs to augment medical practitioner decision-making.',
      'The explosive expansion of multimodal medical datasets necessitates automated feature extraction pipelines capable of processing unstructured clinical records.',
      'Diagnostic decision support engines actively assist physicians by triaging urgent cases, quantifying lesion volumes, and highlighting borderline pathological findings.',
      'Modern predictive healthcare models integrate demographic baselines, longitudinal vitals, lab assays, and genetic markers into holistic health vectors.',
      'Federated machine learning frameworks allow disparate hospital networks to train collaborative diagnostic models without transferring raw patient records.',
      'Algorithmic validation requires extensive cross-cohort testing, adversarial robustness assessments, and blind clinical trials against board-certified specialists.',
      'Integration into hospital information systems (HIS) via HL7/FHIR protocols guarantees minimal disruption to established clinical workflows.',
      'Ethical AI frameworks prioritize algorithmic fairness, transparent confidence intervals, bias mitigation across demographics, and physician interpretability.',
      'Continuous post-deployment monitoring detects dataset shift caused by changing epidemiological patterns and medical imaging equipment upgrades.'
    ];
    flowSteps = [
      'PATIENT TELEMETRY &\nDATA INGESTION',
      'CLINICAL PREPROCESSING &\nFEATURE EXTRACTION',
      'DEEP LEARNING MODEL\nINFERENCE',
      'RISK STRATIFICATION &\nANOMALY SCORING',
      'CLINICAL DECISION\nSUPPORT DASHBOARD',
      'PHYSICIAN VALIDATION &\nPATIENT INTERVENTION'
    ];
    flowExplanation = [
      'Patient Data Ingestion – Aggregates multi-source radiological scans, longitudinal EHR notes, genomic profiles, and real-time ICU sensor telemetry.',
      'Clinical Preprocessing – De-identifies patient information (HIPAA compliance), normalizes multi-scanner artifacts, and extracts standardized clinical tokens.',
      'Deep Neural Inference – Executes validated convolutional and transformer models to identify diagnostic markers and pathological anomalies.',
      'Risk Stratification – Computes empirical confidence scores, patient survival trajectories, and urgent clinical deterioration probabilities in real time.',
      'Clinical Decision Support – Delivers interpretable diagnostic highlights, counterfactual rationales, and pharmacological guidance to attending physicians.',
      'Physician Validation – Clinicians review model recommendations, confirm therapeutic protocols, and document outcomes for continuous model refinement.'
    ];
    conclBullets = [
      'Artificial Intelligence in healthcare significantly elevates clinical diagnostic accuracy, reduces physician burnout, and improves patient survival rates.',
      'Algorithmic triaging mitigates diagnostic variability and enables resource-constrained healthcare facilities to deliver expert-level medical evaluations.',
      'Longitudinal predictive modeling shifts clinical medicine from reactive symptom management to proactive, preventative therapeutic interventions.',
      'Federated learning architectures successfully balance large-scale data aggregation with stringent patient privacy and institutional compliance mandates.',
      'Future developments focus on explainable AI (XAI) models that provide transparent causal rationales to build enduring clinical trust and pass regulatory audits.',
      'Rigorous integration of AI into point-of-care tools drastically reduces medical documentation overhead, allowing physicians to focus on patient care.',
      'Collaborative human-AI partnerships herald a transformative era of proactive, equitable, precision medicine customized to individual genomic profiles.'
    ];
  } else if (t.includes('blockchain') || t.includes('crypto') || t.includes('distributed ledger') || t.includes('smart contract')) {
    overviewSubtitle = 'Blockchain Technology provides a decentralized, cryptographically verifiable ledger architecture that enforces trustless consensus across peer-to-peer networks :';
    overviewBullets = [
      'Decentralized validator nodes maintain identical, synchronized distributed state machines without reliance on central authorities or clearinghouses.',
      'Cryptographic hashing (SHA-256) and Merkle tree data structures guarantee mathematical immutability and instant auditability of recorded transactions.',
      'Programmable smart contracts execute self-enforcing business logic, escrow mechanisms, and automated multi-party financial settlements deterministically.',
      'Modern consensus protocols (Proof of Stake, BFT, PoH) guarantee safety and liveness across mutually untrusted global network participants.',
      'Layer-2 scaling solutions including Rollups and state channels dramatically boost transaction throughput while retaining mainnet security guarantees.',
      'Enterprise implementations span transparent supply chain tracking, verifiable digital credentials, sovereign identity systems, and decentralized finance.',
      'Zero-knowledge cryptography (ZK-SNARKs) enables selective data disclosure, proving computational validity without revealing underlying confidential data.'
    ];
    introBullets = [
      'Blockchain emerged to resolve the classic Byzantine Generals and double-spending problems across open, untrusted peer-to-peer computer networks.',
      'Each block contains a cryptographically verified block header, timestamp, Merkle root of transaction hashes, difficulty target, and reference to parent block.',
      'Peer-to-peer gossip protocols propagate proposed transactions and newly validated blocks across geographically distributed nodes with minimal latency.',
      'Smart contract virtual machines (e.g. EVM, WASM) execute deterministic bytecode, updating global state transitions according to immutable consensus rules.',
      'Cryptographic public-key infrastructure (ECDSA, Ed25519) secures account ownership, transaction authorization, and digital asset custody.',
      'Decentralized governance mechanisms coordinate protocol upgrades, parameter adjustments, and treasury allocations through tokenized stakeholder voting.',
      'Cross-chain interoperability bridges enable asset transfers and atomic messaging across disparate heterogeneous blockchain ecosystems.',
      'Enterprise blockchain consortiums enforce granular permissioning, confidential transaction channels, and regulatory compliance tooling.',
      'Continuous algorithmic enhancements optimize block propagation, mitigate front-running (MEV), and reduce network energy footprints.'
    ];
    flowSteps = [
      'TRANSACTION INITIATION &\nDIGITAL SIGNATURE',
      'P2P GOSSIP BROADCAST &\nMEMPOOL VALIDATION',
      'CONSENSUS ALGORITHM\nEXECUTION',
      'CRYPTOGRAPHIC BLOCK\nCREATION & CHAINING',
      'DISTRIBUTED LEDGER\nSTATE COMMIT',
      'CLIENT CONFIRMATION &\nEVENT NOTIFICATION'
    ];
    flowExplanation = [
      'Transaction Initiation – Users sign transactional payloads with private cryptographic keys, establishing verifiable proof of authorization and origin.',
      'Gossip Propagation – Peer nodes validate digital signatures, inspect account nonces, check account balances, and broadcast transactions to the mempool.',
      'Consensus Execution – Validator nodes run consensus rounds (PoS / PBFT) to elect leaders, propose block candidates, and aggregate multi-signature votes.',
      'Block Assembly – The elected proposer packages ordered transactions into a candidate block, computes the Merkle root, and links the parent cryptographic hash.',
      'State Machine Commit – Network nodes verify all block transactions, apply state transitions to the global ledger, and persist changes to distributed disk stores.',
      'Client Notification – Decentralized indexing nodes emit confirmation event logs to client applications, confirming finality and settlement.'
    ];
    conclBullets = [
      'Blockchain technology provides an immutable, trustless foundation for decentralized computing, value transfer, and verifiable multiparty collaboration.',
      'Cryptographic state verification eliminates single points of operational failure, counterparty settlement risk, and unauthorized data tampering.',
      'Self-executing smart contracts automate intricate contractual obligations, reducing administrative overhead and eliminating intermediaries.',
      'Advancements in Layer-2 rollups and zero-knowledge proofs have effectively addressed legacy scalability, throughput, and privacy bottlenecks.',
      'Enterprise consortia utilize permissioned ledgers to achieve unprecedented transparency and end-to-end auditability across global supply chains.',
      'Standardized tokenization protocols enable the fractional ownership, liquidity, and programmable transfer of real-world tangible and digital assets.',
      'As developer tooling and regulatory clarity mature, blockchain architectures will underpin the next generation of resilient digital infrastructure.'
    ];
  } else if (t.includes('process automation') || t.includes('automation') || t.includes('rpa') || t.includes('workflow')) {
    overviewSubtitle = 'Process Automation provides an integrated engineering framework to orchestrate, optimize, and execute complex business and technical workflows :';
    overviewBullets = [
      'Intelligent process automation combines robotic task execution, machine learning classification, and API orchestration to streamline enterprise operations.',
      'Workflow engines decouple business decision logic from underlying operational services, enabling agile modification of procedural pipelines.',
      'Automated event triggers ingest real-time payloads across distributed microservices, messaging queues, and legacy enterprise software interfaces.',
      'Deterministic execution tracking monitors task completion times, throughput velocity, error exception rates, and computing resource quotas.',
      'Adaptive load balancers distribute asynchronous task queues dynamically across worker nodes, preventing computational starvation and bottlenecks.',
      'Automated exception handling frameworks isolate execution failures, invoke fallback policies, and alert operators with context-rich telemetry.',
      'Standardized process automation significantly accelerates transaction cycle times, reduces manual error rates, and ensures strict regulatory compliance.'
    ];
    introBullets = [
      'Process Automation has evolved from rudimentary scripted macros into cognitive, self-optimizing workflow orchestration systems.',
      'Modern enterprise landscapes suffer from fragmented data silos, manual operational handoffs, inconsistent execution, and slow turnaround cycles.',
      'An enterprise automation architecture establishes structured pipelines where inputs, computational transformations, and system actions are mapped.',
      'Key architectural dimensions include Task Concurrency, Worker Memory Allocations, API Throttling Limits, State Persistence, and Recovery Guarantees.',
      'Central operational metrics measure end-to-end execution latency, process completion rates, resource consumption, and cost per automated transaction.',
      'Workflow management engines maintain atomic state tracking, allowing interrupted tasks to resume deterministically without data duplication or loss.',
      'Deep integration with enterprise APIs, event brokers, and database layers provides comprehensive visibility into process bottlenecks in real time.',
      'Intelligent document processing and cognitive classifiers automate the ingestion and extraction of unstructured data from legacy formats.',
      'Continuous process mining algorithms evaluate event logs to identify sub-optimal routing paths, duplicate approvals, and automation expansion targets.'
    ];
    flowSteps = [
      'EVENT INGESTION &\nTRIGGER DETECTION',
      'PAYLOAD VALIDATION &\nDATA PARSING',
      'WORKFLOW ENGINE\nTASK DISPATCH',
      'AUTOMATED TASK\nEXECUTION',
      'AUDIT LOGGING &\nSTATE COMMIT',
      'COMPLETION &\nNOTIFICATION'
    ];
    flowExplanation = [
      'Trigger Detection – Captures incoming webhook events, scheduled cron triggers, database mutation flags, or queue messages across enterprise systems.',
      'Payload Normalization – Validates input schema conformance, de-duplicates incoming events, and extracts required operational parameters.',
      'Workflow Dispatch – Evaluates conditional business rules, maps routing topologies, and enqueues task payloads into distributed worker queues.',
      'Task Execution – Autonomous workers execute computational transformations, invoke external REST/gRPC APIs, or interact with database backends.',
      'State Persistence – Commits updated workflow status to distributed transactional storage and records immutable compliance audit trails.',
      'Completion Notification – Dispatches completion callbacks, publishes status events to downstream consumers, and updates executive monitoring dashboards.'
    ];
    conclBullets = [
      'Process Automation eliminates repetitive manual effort, drastically shortens transaction cycle times, and improves operational consistency.',
      'Decoupled workflow orchestration allows enterprises to evolve business logic rapidly without modifying underlying core database models.',
      'Comprehensive monitoring and immutable audit logging ensure complete operational visibility and effortless compliance with regulatory mandates.',
      'Distributed worker queues with automated retry policies and exponential backoff provide rock-solid fault tolerance against transient service outages.',
      'Combining rule-based automation with cognitive machine learning enables systems to handle increasingly complex and unstructured enterprise workloads.',
      'Enterprises adopting standardized automation architectures report significant reductions in operational expenditure and customer response times.',
      'Continuous workflow optimization empowers organizations to scale transactional volume exponentially without linear increases in operational staff.'
    ];
  } else if (t.includes('cybersecurity') || t.includes('security') || t.includes('threat') || t.includes('incident')) {
    overviewSubtitle = 'Cybersecurity Incident Response establishes an active defense methodology to detect, contain, and neutralize malicious threats :';
    overviewBullets = [
      'Comprehensive security telemetry ingests endpoint detection events, firewall logs, and intrusion alerts across enterprise infrastructure.',
      'Threat intelligence feeds enrich raw indicators of compromise (IoCs) with global adversary tactics, techniques, and procedures (TTPs).',
      'Automated Security Information and Event Management (SIEM) engines correlate distributed anomalies and score critical risk thresholds.',
      'Rapid incident containment isolates compromised network perimeters and quarantines malicious processes without interrupting production operations.',
      'Forensic root-cause investigation reconstructs the adversary attack chain to identify exploitation vectors and privilege escalation paths.',
      'Coordinated threat eradication and vulnerability patching purge persistent rootkits and validate digital certificate integrity.',
      'Post-incident forensic reviews and automated playbooks enhance security resilience and guarantee regulatory reporting compliance.'
    ];
    introBullets = [
      'Cybersecurity has evolved from passive perimeter defenses into dynamic, threat-informed incident response and automated mitigation architectures.',
      'Enterprises face sophisticated multi-stage threats including advanced persistent threats (APTs), zero-day exploits, and ransomware syndicates.',
      'Security architectures establish structured pipelines spanning continuous telemetry collection, behavioral analytics, containment, and system recovery.',
      'Core operational dimensions include Mean Time to Detect (MTTD), Mean Time to Respond (MTTR), Containment Latency, and Forensic Integrity.',
      'Central security metrics quantify threat severity levels, false-positive ratios, vulnerability exploitability scores, and blast radius impact.',
      'Security Operations Centers (SOC) employ automated orchestration, automation, and response (SOAR) playbooks to accelerate incident triage.',
      'Deep packet inspection, endpoint behavioral telemetry, and honeypot traps provide end-to-end visibility across hybrid enterprise environments.',
      'Zero Trust network segmentation ensures lateral movement is restricted even after initial perimeter compromises occur.',
      'Continuous threat hunting and red-team simulations continuously stress-test detection rules against emerging adversary tactics.'
    ];
    flowSteps = [
      'THREAT DETECTION &\nTELEMETRY INGESTION',
      'ALERT TRIAGE &\nSIEM CORRELATION',
      'INCIDENT ISOLATION &\nPERIMETER CONTAINMENT',
      'FORENSIC ANALYSIS &\nROOT CAUSE AUDIT',
      'MALWARE ERADICATION &\nSYSTEM RECOVERY',
      'POST-INCIDENT REVIEW &\nPLAYBOOK UPDATES'
    ];
    flowExplanation = [
      'Threat Detection – Aggregates security events, firewall packet traces, authentication anomalies, and endpoint telemetry in real time.',
      'Alert Triage – Correlates telemetry against threat intelligence databases to validate genuine incidents and filter benign operational noise.',
      'Incident Isolation – Disconnects affected host nodes from the production network and blocks suspicious inbound and outbound IP addresses.',
      'Forensic Audit – Extracts memory dumps, parses event logs, and maps adversary tradecraft to the MITRE ATT&CK security matrix.',
      'Eradication & Recovery – Removes persistent malicious artifacts, restores systems from verified air-gapped backups, and patches attack vectors.',
      'Post-Incident Review – Updates threat intelligence feeds, refines firewall rules, and documents compliance reports for corporate stakeholders.'
    ];
    conclBullets = [
      'An agile Incident Response lifecycle minimizes enterprise blast radius, preserves system availability, and prevents catastrophic data loss.',
      'Integrating proactive threat intelligence with automated SOAR playbooks slashes mean time to remediate sophisticated cyber threats.',
      'Granular Zero Trust architectural controls prevent unauthorized lateral traversal across segmented enterprise network domains.',
      'Rigorous forensic investigations uncover root vulnerabilities, ensuring long-term systemic remediation rather than temporary superficial fixes.',
      'Continuous purple-team exercises and automated compliance audits guarantee readiness against evolving global threat actors.',
      'Collaborative security protocols build enduring organizational resilience and protect sensitive customer and enterprise digital assets.',
      'Standardized incident response transforms cybersecurity from a reactive cost center into an indispensable proactive business enabler.'
    ];
  } else if (t.includes('energy') || t.includes('solar') || t.includes('microgrid') || t.includes('renewable') || t.includes('power')) {
    overviewSubtitle = 'Solar Microgrid Energy Storage combines renewable generation with intelligent battery storage to ensure optimal power resilience :';
    overviewBullets = [
      'Photovoltaic solar arrays convert solar irradiance into direct current (DC) electricity using high-efficiency semiconductor cells.',
      'Maximum Power Point Tracking (MPPT) charge controllers continuously maximize energy extraction under variable solar irradiance conditions.',
      'Advanced Battery Energy Storage Systems (BESS) buffer surplus daytime generation to supply load demand during peak evening intervals.',
      'Bidirectional smart inverters convert DC to AC power with low harmonic distortion and dynamic reactive power frequency regulation.',
      'Intelligent microgrid management controllers balance variable renewable generation with critical residential and industrial electrical loads.',
      'Grid-interactive islanding switches safely decouple the microgrid during utility outages, guaranteeing uninterrupted resilient power.',
      'Predictive dispatch algorithms evaluate weather forecasts and time-of-use tariffs to optimize economic operational profitability.'
    ];
    introBullets = [
      'Renewable Microgrid Architectures represent a transformative paradigm toward decentralized, low-carbon, and resilient electrical power systems.',
      'Traditional centralized power grids suffer from transmission line losses, fossil-fuel reliance, vulnerability to extreme weather, and peak stress.',
      'A microgrid integrates local distributed energy resources (DERs) including solar photovoltaics, battery storage, and dynamic electrical loads.',
      'Key engineering dimensions include Power Conversion Efficiency, State of Charge (SoC) Dynamics, Voltage Stability, and Islanding Response Time.',
      'Core performance metrics evaluate solar capacity factors, round-trip storage efficiency, levelized cost of energy (LCOE), and carbon displacement.',
      'Intelligent energy management systems (EMS) utilize real-time telemetry to schedule battery charging and discharging cycles dynamically.',
      'High-speed sensor networks monitor grid frequency and voltage deviations, triggering sub-cycle inverter corrections to maintain stability.',
      'Empirical field studies demonstrate that hybridized renewable microgrids achieve over 99.99% critical load reliability during grid blackouts.',
      'Modular energy storage scalability facilitates gradual capacity expansion as commercial and municipal power demands increase over time.'
    ];
    flowSteps = [
      'ENERGY HARVESTING &\nPV GENERATION',
      'MPPT REGULATION &\nDC-DC CONVERSION',
      'BATTERY STORAGE &\nSTATE-OF-CHARGE CTRL',
      'BIDIRECTIONAL INVERTER\nAC SYNCHRONIZATION',
      'INTELLIGENT LOAD\nDISPATCH & BALANCING',
      'GRID INTERACTION &\nISLANDED OPERATION'
    ];
    flowExplanation = [
      'Energy Harvesting – High-efficiency photovoltaic modules capture solar irradiance and generate direct-current electrical energy.',
      'MPPT Regulation – DC-DC converters dynamically match impedance to harvest peak power across fluctuating environmental temperatures.',
      'Battery Storage – Stores excess electrical energy in lithium-ion or flow batteries while monitoring thermal limits and cell voltages.',
      'Inverter Synchronization – Converts stored DC energy into pure sine wave AC electricity, matching utility phase and voltage frequency.',
      'Load Dispatch – Distributes power intelligently between critical medical/industrial facilities and non-essential deferred electrical loads.',
      'Grid & Islanding Operation – Coordinates seamless transition between grid-tied net metering and autonomous off-grid islanded emergency mode.'
    ];
    conclBullets = [
      'Solar Microgrid Energy Storage delivers a dependable, clean, and autonomous energy infrastructure for mission-critical installations.',
      'Integrating MPPT solar tracking with advanced BESS mitigates renewable intermittency and delivers predictable round-the-clock power.',
      'Smart bidirectional inverters provide essential grid ancillary services including voltage support, frequency control, and black-start capabilities.',
      'Algorithmic load dispatch maximizes battery lifespan by preventing deep discharges and optimizing time-of-use energy cost arbitrage.',
      'Autonomous islanding capability ensures complete continuity of critical infrastructure during broader electrical grid disruptions.',
      'Decentralized renewable architectures significantly reduce transmission losses while accelerating the transition to net-zero carbon operations.',
      'Renewable microgrids constitute the foundational pillar for future sustainable, resilient, and intelligent electrical power ecosystems.'
    ];
  }

  return {
    templateId: 'template-academic-flowchart',
    topic,
    title: mainTitle,
    slides: [
      {
        type: 'overview',
        title: mainTitle,
        subtitle: overviewSubtitle,
        bullets: overviewBullets
      },
      {
        type: 'introduction',
        title: 'INTRODUCTION :',
        bullets: introBullets
      },
      {
        type: 'process',
        title: `${toUpperCaseTitle(topic).replace(/[\s:]+$/, '')} ANALYSIS PROCESS :`,
        leftHeading: 'FLOW CHART EXPLANATION :',
        leftBullets: flowExplanation,
        rightHeading: 'SIMPLE FLOW CHART :',
        flowchart: flowSteps
      },
      {
        type: 'conclusion',
        title: 'CONCLUSION :',
        bullets: conclBullets
      }
    ]
  };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * TEMPLATE 2: Executive Technical Seminar (Multi-Column & Metric Cards)
 * ─────────────────────────────────────────────────────────────────────────────
 */
function synthesizeTemplate2Deck(topic, subject, t, headlineTitle, reportContent) {
  let slide1Subtitle = `Controlling and optimizing resource consumption during ${topic} execution`;
  let slide1Banner = `${topic} = Structured Governance & Execution Guarantees Across Distributed Environments`;
  let slide1Bullets = [
    `${topic} is deployed across modern enterprise cloud environments using a multi-tenant, shared-resource computing architecture.`,
    `Execution governance constraints prevent any single thread or workflow from consuming excessive shared CPU, memory, or database bandwidth.`,
    `Operational limits and safety parameters are continuously enforced while backend code, worker tasks, and automated pipelines execute.`,
    `Essential parameters include transaction concurrency, query quotas, memory heap ceilings, external callout timeouts, and CPU processing budgets.`,
    `When an execution thread exceeds an allocated governance boundary, the runtime engine terminates the task and raises a clean, recoverable exception.`,
    `The overarching purpose of these architectural constraints is to maintain platform stability, high availability, determinism, and equitable performance.`
  ];

  let slide2Title = `Major ${topic} Operational Parameters & Limits :`;
  let slide2Subtitle = `Common limits and architectural parameters developers must evaluate when designing ${topic} applications`;
  let slide2TableHeaders = ['Operational Limit', 'Purpose / Mechanism', 'Why It Matters / Impact'];
  let slide2TableRows = [
    ['Throughput Capacity', 'Controls the rate of transactions or operations processed per unit time.', 'Prevents excessive database access and buffer overflow.'],
    ['Batch Mutation Rows', 'Limits the total number of records affected by a single operational statement.', 'Encourages efficient bulk processing and predictable commit times.'],
    ['Compute Time Budget', 'Regulates processor clock time consumed by core algorithms and related jobs.', 'Protects shared computing infrastructure and prevents thread starvation.'],
    ['Heap & Memory Quotas', 'Controls memory allocated for runtime objects, cached collections, and datasets.', 'Prevents excessive memory consumption and out-of-memory crashes.'],
    ['External API Callouts', 'Restricts the count and timeout duration of external HTTP web service invocations.', 'Protects integration pipelines and prevents blocking IO delays.'],
    ['Thread Pool Concurrency', 'Regulates the number of simultaneous asynchronous workers spawned per tenant.', 'Prevents system congestion and ensures fair multi-tenant resource sharing.']
  ];
  let slide2Footnote = '• Parameters vary by operational context; synchronous and asynchronous execution pipelines enforce distinct resource thresholds.';

  let slide3Title = `How ${topic} Execution Works :`;
  let slide3Subtitle = 'Explanation on the left and a simple execution flow on the right';
  let slide3LeftSteps = [
    `1. A user interaction, scheduled timer, API request, or automated trigger starts a ${topic} execution transaction.`,
    '2. The runtime engine initializes an isolated execution context and establishes real-time resource telemetry counters.',
    '3. Every algorithmic step, database lookup, payload mutation, and external service call is tracked against established quotas.',
    '4. If resource consumption remains within defined governance boundaries, execution advances and the operational transaction commits.',
    '5. If any operational limit or timeout ceiling is exceeded, the runtime engine stops execution and raises a descriptive runtime exception.',
    '6. System engineers prevent runtime exceptions by bulkifying code, utilizing caching, and delegating heavy workloads to asynchronous background queues.'
  ];
  let slide3Flowchart = [
    'Transaction Starts',
    'Core Execution Runs',
    'Resources Tracked',
    'Within Safe Limits?',
    'Yes -> Complete',
    'No -> Exception / Alert'
  ];

  let slide4Title = 'Best Practices, Applications and Conclusion :';
  let slide4Subtitle = `Engineering best practices and practical implementation guidelines for ${topic}`;
  let slide4BestPractices = [
    '• Adopt bulkified data patterns to process collections rather than isolated atomic records.',
    '• Avoid recursive invocations and expensive database queries inside iterative loops.',
    '• Query only the specific fields and attributes strictly required by downstream consumers.',
    '• Utilize indexed collections, hash maps, and in-memory caches to organize data efficiently.',
    '• Delegate large-volume or long-running computational workloads to asynchronous workers.'
  ];
  let slide4Applications = [
    `• Automated enterprise workflows and event-driven ${topic} business processes.`,
    '• Real-time transactional data ingestion, validation, and analytics reporting pipelines.',
    '• High-throughput batch processing operations and scheduled maintenance utilities.',
    '• Secure cross-platform integrations with external microservices and third-party APIs.',
    '• Mission-critical enterprise software systems requiring 99.99% availability and predictable latency.'
  ];
  let slide4KeyTakeaways = [
    `• Governance limits protect the shared infrastructure and guarantee deterministic system stability.`,
    '• Limit exceptions signal architectural inefficiencies that require code optimization.',
    '• Understanding operational constraints enables engineers to design highly scalable architectures.',
    '• Proactive resource budgeting significantly improves application throughput and reliability.',
    '• Execution boundaries should be embraced as a guiding design principle rather than a restriction.'
  ];
  let slide4Conclusion = `Conclusion: Understanding and respecting ${topic} architectural limits and governance principles is essential for building secure, scalable, reliable, and high-performing production systems.`;

  // Specific domain tuning for Salesforce CRM topic if requested
  if (t.includes('salesforce') || t.includes('governor limits') || t.includes('apex')) {
    slide1Subtitle = 'Controlling resource consumption during Apex execution';
    slide1Banner = 'Governor Limits = Runtime Restrictions on Salesforce Resources';
    slide1Bullets = [
      'Salesforce is a cloud-based CRM platform that uses a multi-tenant architecture, where many organizations share platform resources.',
      'Governor limits prevent a single transaction from consuming an excessive amount of shared CPU, memory, database, or processing resources.',
      'Execution governor limits are applied while Apex code, triggers, and other platform processes are running.',
      'Important limits include SOQL queries, SOSL queries, DML statements, DML records, CPU time, heap size, and callouts.',
      'When an Apex transaction exceeds a governor limit, Salesforce stops the transaction and raises a runtime exception.',
      'The purpose of these limits is to maintain platform performance, stability, reliability, and fair resource usage.'
    ];
    slide2Title = 'Major Execution Governor Limits :';
    slide2Subtitle = 'Common limits that developers must consider when designing Apex applications';
    slide2TableHeaders = ['Limit', 'Purpose', 'Why It Matters'];
    slide2TableRows = [
      ['SOQL Queries', 'Controls the number of database queries in one transaction.', 'Prevents excessive database access.'],
      ['DML Statements', 'Controls insert, update, delete, undelete and other DML operations.', 'Encourages efficient bulk processing.'],
      ['DML Rows', 'Limits the total number of records affected by DML.', 'Prevents very large transactions.'],
      ['CPU Time', 'Controls processor time consumed by Apex and related execution.', 'Protects shared computing resources.'],
      ['Heap Size', 'Controls memory used for objects, collections, and data during execution.', 'Prevents excessive memory consumption.'],
      ['Callouts', 'Limits external HTTP/web-service requests during a transaction.', 'Helps control integration resources.']
    ];
    slide2Footnote = '• Limits vary by execution context; synchronous and asynchronous Apex can have different resource limits.';
    slide3Title = 'How Execution Governor Limits Work :';
    slide3Subtitle = 'Explanation on the left and a simple execution flow on the right';
    slide3LeftSteps = [
      '1. A user action, trigger, API request, or automation starts an Apex transaction.',
      '2. Salesforce creates an execution context and tracks the resources consumed by that transaction.',
      '3. Every SOQL query, DML operation, CPU operation, and memory allocation counts toward the limits.',
      '4. If the code remains within the limits, execution continues and the transaction can complete successfully.',
      '5. If any governor limit is exceeded, Salesforce throws a runtime exception and the transaction fails.',
      '6. Developers avoid these failures by bulkifying code, reducing queries and DML, and using asynchronous Apex.'
    ];
    slide3Flowchart = [
      'Transaction Starts',
      'Apex / Trigger Runs',
      'Resources Are Counted',
      'Within Governor Limits?',
      'Yes -> Complete',
      'No -> Limit Exception'
    ];
    slide4Title = 'Best Practices, Applications and Conclusion :';
    slide4Subtitle = 'Writing Apex that works efficiently within Salesforce execution limits';
    slide4BestPractices = [
      '• Use bulkified Apex to process collections instead of single records.',
      '• Avoid SOQL queries and DML statements inside loops.',
      '• Query only the fields and records that are actually required.',
      '• Use Lists, Sets, and Maps to organize and reuse data efficiently.',
      '• Use asynchronous Apex for suitable long-running or large-volume operations.'
    ];
    slide4Applications = [
      '• Salesforce triggers and automated business processes.',
      '• Customer, sales, service, and account data processing.',
      '• Large-volume data operations and scheduled jobs.',
      '• Integration with external systems through callouts.',
      '• Custom CRM applications developed using Apex.'
    ];
    slide4KeyTakeaways = [
      '• Governor limits protect the shared Salesforce environment.',
      '• Limit exceptions usually indicate inefficient resource usage.',
      '• Understanding limits helps developers design scalable applications.',
      '• Efficient coding improves performance and reliability.',
      '• Governor limits are a design consideration, not simply a restriction.'
    ];
    slide4Conclusion = 'Conclusion: Understanding and respecting execution governor limits is essential for secure, scalable, reliable, and high-performing Salesforce CRM applications.';
  }

  return {
    templateId: 'template-executive-grid',
    topic,
    title: headlineTitle,
    slides: [
      {
        type: 'executive_overview',
        title: headlineTitle,
        subtitle: slide1Subtitle,
        banner: slide1Banner,
        bullets: slide1Bullets,
        slideNumber: 1
      },
      {
        type: 'parameter_matrix',
        title: slide2Title,
        subtitle: slide2Subtitle,
        tableHeaders: slide2TableHeaders,
        tableRows: slide2TableRows,
        footnote: slide2Footnote,
        slideNumber: 2
      },
      {
        type: 'executive_process',
        title: slide3Title,
        subtitle: slide3Subtitle,
        leftHeading: 'LEFT — Explanation',
        leftSteps: slide3LeftSteps,
        rightHeading: 'RIGHT — Simple Flow Chart',
        flowchart: slide3Flowchart,
        slideNumber: 3
      },
      {
        type: 'three_column_conclusion',
        title: slide4Title,
        subtitle: slide4Subtitle,
        columns: [
          { title: 'Best Practices', bullets: slide4BestPractices },
          { title: 'Applications', bullets: slide4Applications },
          { title: 'Key Takeaways', bullets: slide4KeyTakeaways }
        ],
        conclusionBanner: slide4Conclusion,
        slideNumber: 4
      }
    ]
  };
}

module.exports = {
  synthesizeTopicDeck,
  toUpperCaseTitle,
  toHeadlineTitle
};
