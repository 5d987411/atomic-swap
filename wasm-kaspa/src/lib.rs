use once_cell::sync::Lazy;
use secp256k1::{Message, PublicKey, Secp256k1, SecretKey, Signature};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::sync::Mutex;
use wasm_bindgen::prelude::*;

static HTLC_STORE: Lazy<Mutex<HashMap<String, HtlcInfo>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

#[derive(serde::Serialize, Clone)]
pub struct HtlcInfo {
    pub id: String,
    pub amount: u64,
    pub hashlock: String,
    pub timelock: u64,
    pub sender: String,
    pub receiver: String,
    pub created_at: u64,
    pub state: String,
}

#[derive(serde::Serialize)]
pub struct HtlcTx {
    pub txid: String,
    pub raw_hex: String,
    pub script: String,
    pub address: String,
}

#[derive(serde::Serialize)]
pub struct SwapState {
    pub state: String,
    pub step: u8,
    pub secret: Option<String>,
    pub htlc_a: Option<HtlcInfo>,
    pub htlc_b: Option<HtlcInfo>,
}

#[wasm_bindgen]
pub struct KaspaSwap {
    network: String,
    secret: Option<Vec<u8>>,
}

#[wasm_bindgen]
impl KaspaSwap {
    #[wasm_bindgen(constructor)]
    pub fn new(network: String) -> KaspaSwap {
        console_error_panic_hook::set_once();
        KaspaSwap {
            network,
            secret: None,
        }
    }

    pub fn generate_secret(&mut self) -> String {
        let mut rng = oorandom::Rand32::new(42);
        let mut bytes = [0u8; 32];
        rng.fill_bytes(&mut bytes);
        self.secret = Some(bytes.clone());
        hex::encode(bytes)
    }

    pub fn compute_hashlock(&self, preimage: &str) -> String {
        let preimage_bytes = hex::decode(preimage).expect("Invalid hex");
        let mut hasher = Sha256::new();
        hasher.update(&preimage_bytes);
        let result = hasher.finalize();
        hex::encode(result)
    }

    pub fn build_htlc_script(
        &self,
        hashlock: &str,
        timelock: u64,
        sender_pubkey: &str,
        receiver_pubkey: &str,
    ) -> String {
        let hashlock_bytes = hex::decode(hashlock).expect("Invalid hashlock hex");
        let sender_pk = hex::decode(sender_pubkey).expect("Invalid sender pubkey");
        let receiver_pk = hex::decode(receiver_pubkey).expect("Invalid receiver pubkey");

        let mut script = Vec::new();

        script.extend_from_slice(b"\x20");
        script.extend_from_slice(&hashlock_bytes);
        script.extend_from_slice(b"\x88");
        script.push(0xac);

        script.extend_from_slice(b"\x20");
        script.extend_from_slice(&[0u8; 32]);
        script.push(0x87);

        script.extend_from_slice(b"\x63");
        script.push(0x52);
        script.extend_from_slice(b"\x88");
        script.push(0xae);

        hex::encode(script)
    }

    pub fn deploy_htlc(
        &self,
        amount: u64,
        hashlock: &str,
        timelock: u64,
        receiver: &str,
    ) -> Result<JsValue, JsValue> {
        let id = format!("htlc_{}", hex::encode(&hashlock[..8]));

        let info = HtlcInfo {
            id: id.clone(),
            amount,
            hashlock: hashlock.to_string(),
            timelock,
            sender: String::new(),
            receiver: receiver.to_string(),
            created_at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
            state: "locked".to_string(),
        };

        let mut store = HTLC_STORE.lock().map_err(|_| "Lock error")?;
        store.insert(id, info.clone());

        Ok(serde_wasm_bindgen::to_value(&info).unwrap())
    }

    pub fn claim_htlc(&self, htlc_id: &str, preimage: &str) -> Result<JsValue, JsValue> {
        let mut store = HTLC_STORE.lock().map_err(|_| "Lock error")?;

        if let Some(info) = store.get_mut(htlc_id) {
            info.state = "claimed".to_string();
            return Ok(serde_wasm_bindgen::to_value(&info.clone()).unwrap());
        }

        Err(JsValue::from("HTLC not found"))
    }

    pub fn refund_htlc(&self, htlc_id: &str) -> Result<JsValue, JsValue> {
        let mut store = HTLC_STORE.lock().map_err(|_| "Lock error")?;

        if let Some(info) = store.get_mut(htlc_id) {
            info.state = "refunded".to_string();
            return Ok(serde_wasm_bindgen::to_value(&info.clone()).unwrap());
        }

        Err(JsValue::from("HTLC not found"))
    }

    pub fn get_htlc(&self, htlc_id: &str) -> Result<JsValue, JsValue> {
        let store = HTLC_STORE.lock().map_err(|_| "Lock error")?;

        if let Some(info) = store.get(htlc_id) {
            return Ok(serde_wasm_bindgen::to_value(info).unwrap());
        }

        Err(JsValue::from("HTLC not found"))
    }

    pub fn create_address_from_pubkey(&self, pubkey: &str) -> String {
        format!("kaspa:{}", pubkey)
    }
}

#[wasm_bindgen]
pub fn init_panic_hook() {
    console_error_panic_hook::set_once();
}
