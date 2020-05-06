#!/usr/bin/env python3

import pytest
from datetime import datetime,timedelta
from croniter import croniter
from validate import validate_event_webhook,validate_event_headers
from queue import Empty
import time

# The create and delete tests should ideally go in setup and teardown YAML files,
# We can't use that here because, the payload is dynamic i.e. in case of adhoc Scheduled Triggers
# the value is the current timestamp and in case of cron Scheduled Triggers, the cron schedule is
# derived based on the current timestamp

def stringify_datetime(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%S.%fZ")

class TestOneOffScheduledTrigger(object):

    webhook_payload = {"foo":"baz"}

    header_conf = [
        {
            "name":"header-key",
            "value":"header-value"
        }
    ]

    url = "/v1/query"

    webhook_domain = "http://127.0.0.1:5594"


    def test_create_valid_one_off_scheduled_trigger(self,hge_ctx):
        query = {
            "type":"create_scheduled_trigger_one_off",
            "args":{
                "webhook":self.webhook_domain + '/test',
                "schedule_at":stringify_datetime(datetime.utcnow()),
                "payload":self.webhook_payload,
                "headers":self.header_conf
            }
        }
        st, resp = hge_ctx.v1q(query)
        assert st == 200,resp

    def test_create_trigger_with_very_old_scheduled_time(self,hge_ctx):
        query = {
            "type":"create_scheduled_trigger_one_off",
            "args":{
                "webhook":{"from_env":"SCHEDULED_TRIGGERS_WEBHOOK"},
                "schedule_at": "2020-01-01T00:00:00Z",
                "payload":self.webhook_payload,
                "headers":self.header_conf
            }
        }
        st, resp = hge_ctx.v1q(query)
        assert st == 200,resp

    def test_create_trigger_with_error_returning_webhook(self,hge_ctx):
        query = {
            "type":"create_scheduled_trigger_one_off",
            "args":{
                "webhook":self.webhook_domain + '/fail',
                "schedule_at": stringify_datetime(datetime.utcnow()),
                "payload":self.webhook_payload,
                "headers":self.header_conf,
                "retry_conf":{
                    "num_retries":1,
                    "retry_interval_seconds":1,
                    "timeout_seconds":1,
                    "tolerance_seconds": 21600
                }
            }
        }
        st, resp = hge_ctx.v1q(query)
        assert st == 200, resp

    def test_check_fired_webhook_event(self,hge_ctx,scheduled_triggers_evts_webhook):
        event = scheduled_triggers_evts_webhook.get_event(65)
        validate_event_webhook(event['path'],'/test')
        validate_event_headers(event['headers'],{"header-key":"header-value"})
        assert event['body'] == self.webhook_payload
        assert scheduled_triggers_evts_webhook.is_queue_empty()

    def test_check_events_statuses(self,hge_ctx):
        time.sleep(65) # need to sleep here for atleast a minute for the failed event to be retried
        query = {
            "type":"run_sql",
            "args":{
                "sql":"select status,tries from hdb_catalog.hdb_one_off_scheduled_events"
            }
        }
        st, resp = hge_ctx.v1q(query)
        assert st == 200, resp
        scheduled_event_statuses = dict(resp['result'])
        # 3 one-off scheduled triggers have been created
        # one should be dead because the timestamp was past the tolerance limit
        # one should be delivered because all the parameters were reasonable
        # one should be error because the webhook returns an error state
        assert "dead" in scheduled_event_statuses
        assert "delivered" in scheduled_event_statuses
        assert int(scheduled_event_statuses['error']) == 2 # num_retries + 1

    def test_teardown_one_off_scheduled_events(self,hge_ctx):
        query = {
            "type":"run_sql",
            "args": {
                "sql":"delete from hdb_catalog.hdb_one_off_scheduled_events"
            }
        }
        st, resp = hge_ctx.v1q(query)
        assert st == 200,resp

class TestScheduledTriggerCron(object):

    cron_trigger_name = "cron_scheduled_trigger"

    def test_create_cron_schedule_triggers(self,hge_ctx):
        # setting the test to be after 30 mins, to make sure that
        # any of the events are not delivered.
        min_after_30_mins = (datetime.utcnow() + timedelta(minutes=30)).minute
        TestScheduledTriggerCron.cron_schedule = "{} * * * *".format(min_after_30_mins)

        cron_st_api_query = {
            "type":"create_scheduled_trigger_cron",
            "args":{
                "name":self.cron_trigger_name,
                "webhook":"http://127.0.0.1:5594" + "/foo",
                "schedule":self.cron_schedule,
                "headers":[
                    {
                        "name":"foo",
                        "value":"baz"
                    }
                ],
                "payload":{"foo":"baz"}
            }
        }
        cron_st_code,cron_st_resp = hge_ctx.v1q(cron_st_api_query)
        TestScheduledTriggerCron.init_time = datetime.utcnow()
        # the cron events will be generated based on the current time, they
        # will not be exactly the same though(the server now and now here)
        assert cron_st_code == 200
        assert cron_st_resp['message'] == 'success'

    def test_check_generated_cron_scheduled_events(self,hge_ctx):
        expected_schedule_timestamps = []
        iter = croniter(self.cron_schedule,self.init_time)
        for i in range(100):
            expected_schedule_timestamps.append(iter.next(datetime))
        # Get timestamps in UTC from the db to compare it with
        # the croniter generated timestamps
        sql = '''
        select timezone('utc',scheduled_time) as scheduled_time
        from hdb_catalog.hdb_scheduled_events where
        name = '{}' order by scheduled_time asc;'''
        q = {
            "type":"run_sql",
            "args":{
                "sql":sql.format(self.cron_trigger_name)
            }
        }
        st,resp = hge_ctx.v1q(q)
        assert st == 200
        ts_resp = resp['result'][1:]
        assert len(ts_resp) == 100
        # 100 scheduled events are generated in a single batch when the
        # scheduled events need hydration
        actual_schedule_timestamps = []
        for ts in ts_resp:
            datetime_ts = datetime.strptime(ts[0],"%Y-%m-%d %H:%M:%S")
            actual_schedule_timestamps.append(datetime_ts)
        assert actual_schedule_timestamps == expected_schedule_timestamps

    def test_delete_cron_scheduled_trigger(self,hge_ctx):
        q = {
            "type":"delete_scheduled_trigger_cron",
            "args":{
                "name":self.cron_trigger_name
            }
        }
        st,resp = hge_ctx.v1q(q)
        assert st == 200,resp
