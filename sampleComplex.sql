CREATE TABLE lease
(
  pms_company_id TEXT,
  pms_property_id TEXT,

  pms_tenant_id TEXT,

  pms_unit_id TEXT,

  /* t132456-04042021 */
  pms_lease_id TEXT NOT NULL,  

  /* deliberately not establishing RI to unit or unit_type since changes to
   * unit structure are not cascaded through the model.
   */
  unit_type TEXT NOT NULL,

  /* unit sf as of when the lease was recorded.  For exotic reasons, this
   * can change on the unit table but we would want to keep the hitorical
   * value here 
   */
  unit_sf INT,

  renewal BOOL,
  executed_date DATE, /* application for new leases, sign for renewals */

  /* date the tenant indicated intent to go MTM after scheduled end */
  MTM_indicated DATE,

  /* pre-MTM expiration */
  scheduled_lease_end_date DATE,
  adjusted_lease_end_date DATE, /* not sure if we need this */

  /* lease start vs ACTUAL (not scheduled) lease end */
  contracted DATERANGE,

  /* XXX: going away */
  cancelled_date DATE,

  gross_rent INT,  /* monthly pre consession rent, without MTM */
  effective_rent INT, /* monthly post concesson rent, without MTM */

  suspicious_tradeout BOOL,
  suspicious_gross_rent BOOL,
  suspicious_effective_rent BOOL,

  first_bill_date_for_deposit_ins DATE,

  created TIMESTAMPTZ DEFAULT now(),
  updated TIMESTAMPTZ,

  imputation_flags imputation_flag_t[],
  waiver_eligible BOOL,
  has_ledger BOOL,
  has_billing BOOL,

  rejection_flags rejection_flag_t[],

  effective_rent_lease_start INT,
  effective_rent_full INT,
  effective_rent_ledger_60 INT,
  term INT,

  last_posted_fetch DATE,

  waiver_charge_code TEXT,

  min_charge_code_date DATE,
  max_charge_code_date DATE,
  charge_transaction_type TEXT,
  waiver_charge_code_amount NUMERIC(13,2),

  PRIMARY KEY(pms_company_id, pms_property_id, pms_lease_id),

  EXCLUDE USING gist(
    pms_company_id WITH =,
    pms_property_id WITH =,
    pms_unit_id WITH =,
    contracted WITH && 
  ) WHERE (rejection_flags IS NULL) DEFERRABLE INITIALLY DEFERRED,

  FOREIGN KEY(pms_company_id, pms_property_id)
  REFERENCES property ON UPDATE CASCADE ON DELETE CASCADE    
);  

CREATE INDEX ON lease(pms_company_id, pms_property_Id, pms_tenant_id);