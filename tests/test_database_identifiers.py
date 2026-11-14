"""Database-ID contracts, without a Temporal server, model or database."""
import unittest
import uuid
from test_runtime_boundaries import load_nodes


class DatabaseIdentifierTests(unittest.TestCase):
    def setUp(self):
        self.parse = load_nodes('gds_api/identifiers.py', ['parse_database_uuid'],
                                {'uuid': uuid})['parse_database_uuid']

    def test_valid_uuid_is_preserved(self):
        identity = uuid.uuid4()
        self.assertIs(self.parse(identity, record_type='mission'), identity)
        for text in (str(identity), identity.hex, str(identity).upper()):
            self.assertEqual(self.parse(text, record_type='mission'), identity)

    def test_legacy_bridge_id_is_not_mapped_or_truncated(self):
        with self.assertRaises(ValueError):
            self.parse('mission-0123456789ab', record_type='mission')

    def test_invalid_types_and_shapes_are_rejected(self):
        for value in (None, '', [], {}, 1, True, b'identifier', 'not-an-id'):
            with self.subTest(value=type(value).__name__), self.assertRaises(ValueError):
                self.parse(value, record_type='task')

    def test_failure_does_not_disclose_caller_value(self):
        value = 'private-external-identifier'
        with self.assertRaises(ValueError) as caught:
            self.parse(value, record_type='approval')
        self.assertNotIn(value, str(caught.exception))

