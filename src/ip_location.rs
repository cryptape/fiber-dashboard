use std::{collections::HashMap, sync::OnceLock};

use ipinfo::{IpDetails, IpError, IpInfo};

#[allow(static_mut_refs)]
fn ipinfo_cache() -> &'static mut HashMap<String, IpDetails> {
    static mut IPINFO_CACHE: OnceLock<HashMap<String, IpDetails>> = OnceLock::new();

    // Safety: only one thread can access here
    unsafe {
        IPINFO_CACHE.get_or_init(Default::default);
        IPINFO_CACHE.get_mut().unwrap()
    }
}

#[allow(static_mut_refs)]
fn ipinfo() -> &'static mut IpInfo {
    static mut IPINFO: OnceLock<IpInfo> = OnceLock::new();

    // Safety: only one thread can access here
    unsafe {
        IPINFO.get_or_init(|| {
            let ipinfo_io_token = match ::std::env::var("IPINFO_IO_TOKEN") {
                Ok(token) if !token.is_empty() => Some(token),
                _ => {
                    log::warn!("Miss environment variable \"IPINFO_IO_TOKEN\", use empty value");
                    None
                }
            };
            ipinfo::IpInfo::new(ipinfo::IpInfoConfig {
                token: ipinfo_io_token,
                cache_size: 10000,
                ..Default::default()
            })
            .expect("Connect to https://ipinfo.io")
        });
        IPINFO.get_mut().unwrap()
    }
}

pub async fn lookup_ipinfo(ip: &str) -> Result<IpDetails, IpError> {
    let global_ipinfo_cache = ipinfo_cache();

    if let Some(ipdetails) = global_ipinfo_cache.get(&ip.to_string()) {
        return Ok(ipdetails.clone());
    }

    let lookup_info = ipinfo().lookup(ip).await;
    match lookup_info {
        Ok(ipdetails) => {
            global_ipinfo_cache.insert(ip.to_string(), ipdetails.to_owned());

            Ok(ipdetails.to_owned())
        }
        Err(err) => {
            log::warn!("IPINFO.lookup(\"{}\"), error: {}", ip, err);
            Err(err)
        }
    }
}
