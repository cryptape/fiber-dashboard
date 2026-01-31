use std::pin::Pin;

use chrono::{DateTime, Timelike, Utc};
use tokio::time::Sleep;

pub struct ClockTimer {
    schedule_type: ScheduleType,
    run_immediately: bool,
    sleep: Option<Pin<Box<Sleep>>>,
    next_trigger: Option<DateTime<Utc>>,
}

enum ScheduleType {
    Daily { hour: u32, minute: u32 },
    Hourly { minute: u32, second: u32 },
    IntervalWithMinute { minute: u32, second: u32 },
}

impl ClockTimer {
    pub fn new_daily(hour: u32, minute: u32, run_immediately: bool) -> Self {
        ClockTimer {
            schedule_type: ScheduleType::Daily { hour, minute },
            run_immediately,
            sleep: None,
            next_trigger: None,
        }
    }

    pub fn new_hourly(minute: u32, second: u32, run_immediately: bool) -> Self {
        ClockTimer {
            schedule_type: ScheduleType::Hourly { minute, second },
            run_immediately,
            sleep: None,
            next_trigger: None,
        }
    }

    /// trigger every `now / minute == 0` minutes at `second` seconds
    pub fn new_interval_with_minute(minute: u32, second: u32, run_immediately: bool) -> Self {
        ClockTimer {
            schedule_type: ScheduleType::IntervalWithMinute { minute, second },
            run_immediately,
            sleep: None,
            next_trigger: None,
        }
    }

    fn next_trigger_time(&self, now: DateTime<Utc>) -> DateTime<Utc> {
        match self.schedule_type {
            ScheduleType::Daily { hour, minute } => {
                let mut next = now
                    .with_hour(hour)
                    .unwrap()
                    .with_minute(minute)
                    .unwrap()
                    .with_second(0)
                    .unwrap()
                    .with_nanosecond(0)
                    .unwrap();
                if next <= now {
                    next += chrono::Duration::days(1);
                }
                next
            }
            ScheduleType::Hourly { minute, second } => {
                let mut next = now
                    .with_minute(minute)
                    .unwrap()
                    .with_second(second)
                    .unwrap()
                    .with_nanosecond(0)
                    .unwrap();
                if next <= now {
                    next += chrono::Duration::hours(1);
                }
                next
            }
            ScheduleType::IntervalWithMinute { minute, second } => {
                let now_minute = now.minute();
                let remainder = now_minute % minute;
                let minutes_to_add = if remainder == 0 && now.second() == 0 {
                    minute
                } else {
                    minute - remainder
                };
                now.with_second(second).unwrap().with_nanosecond(0).unwrap()
                    + chrono::Duration::minutes(minutes_to_add as i64)
            }
        }
    }

    /// A tick method compatible with tokio::select!
    //
    // This method preserves the internal sleep future state and can be safely used in select!.
    /// If tick() is interrupted in select!, the next call will continue waiting for the original target time.
    pub async fn tick(&mut self) -> DateTime<Utc> {
        if self.run_immediately {
            self.run_immediately = false;
            return Utc::now();
        }

        // If sleep has not been initialized yet, initialize it first (on first call or after the last completion).
        if self.sleep.is_none() {
            let now = Utc::now();
            let next_time = self.next_trigger_time(now);
            let duration_until_next = next_time.signed_duration_since(now);
            let duration_std = match duration_until_next.to_std() {
                Ok(d) if d.as_millis() > 0 => d,
                _ => return Utc::now(), // If the duration is zero or negative, return immediately
            };

            self.sleep = Some(Box::pin(tokio::time::sleep(duration_std)));
            self.next_trigger = Some(next_time);
        }

        // Wait for the sleep to complete
        if let Some(ref mut sleep) = self.sleep {
            sleep.as_mut().await;
        }

        let next_time = self.next_trigger.unwrap_or_else(Utc::now);
        let now = Utc::now();
        log::info!(
            "ClockTimer triggered at: {}, Planned time: {}, delay: {}ms",
            now,
            next_time,
            now.signed_duration_since(next_time).num_milliseconds()
        );

        // Clear the state, the next call to tick() will recalculate the next trigger time
        self.sleep = None;
        self.next_trigger = None;

        now
    }
}
