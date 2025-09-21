insert into public.practice_areas (slug, name) values
('administrative-regulatory-law','Administrative & Regulatory Law'),
('alternative-dispute-resolution-law','Alternative Dispute Resolution Law'),
('arbitration','Arbitration'),
('aviation-law','Aviation Law'),
('banking-financial-services','Banking & Financial Services'),
('class-actions','Class Actions'),
('climate-change','Climate Change'),
('commercial-law','Commercial Law'),
('company-law','Company Law'),
('competition-law','Competition Law'),
('constitutional-human-rights-law','Constitutional & Human Rights Law'),
('construction-engineering-law','Construction & Engineering Law'),
('contract-law','Contract Law'),
('corporate-commercial-law','Corporate & Commercial Law'),
('credit-consumer-law','Credit & Consumer Law'),
('criminal-law','Criminal Law'),
('customary-law','Customary Law'),
('cyber-law','Cyber Law'),
('delictual-claims','Delictual Claims'),
('employment-labour-law','Employment & Labour Law'),
('energy-law','Energy Law'),
('environmental-law','Environmental Law'),
('family-law','Family Law'),
('financial-services-board-litigation','Financial Services Board Litigation'),
('foreign-exchange-law','Foreign Exchange Law'),
('general-civil-litigation','General Civil Litigation'),
('general-litigation','General Litigation'),
('insolvency-business-rescue-law','Insolvency & Business Rescue Law'),
('insurance-law','Insurance Law'),
('intellectual-property-law','Intellectual Property Law'),
('investment-funds-law','Investment Funds Law'),
('labour-law','Labour Law'),
('litigation-dispute-resolution','Litigation & Dispute Resolution'),
('mergers-acquisitions','Mergers & Acquisitions'),
('oil-gas-law','Oil & Gas Law'),
('property-law','Property Law'),
('tax-law','Tax Law')
on conflict (slug) do nothing;

insert into public.languages (code, name) values
('en','English'),('af','Afrikaans'),('zu','Zulu'),('xh','Xhosa'),('st','Sotho')
on conflict (code) do nothing;

insert into public.provinces (name, slug) values
('Gauteng','gauteng'),('Western Cape','western-cape'),('KwaZulu-Natal','kwazulu-natal'),('Eastern Cape','eastern-cape'),('Free State','free-state'),('Limpopo','limpopo'),('Mpumalanga','mpumalanga'),('North West','north-west'),('Northern Cape','northern-cape')
on conflict (slug) do nothing;

-- sample cities
insert into public.cities (province_id, name, slug, latitude, longitude)
select p.id, 'Johannesburg','johannesburg', -26.2041, 28.0473 from public.provinces p where p.slug='gauteng';
insert into public.cities (province_id, name, slug, latitude, longitude)
select p.id, 'Pretoria','pretoria', -25.7479, 28.2293 from public.provinces p where p.slug='gauteng';
insert into public.cities (province_id, name, slug, latitude, longitude)
select p.id, 'Cape Town','cape-town', -33.9249, 18.4241 from public.provinces p where p.slug='western-cape';