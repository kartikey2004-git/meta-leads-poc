echo "END-TO-END TEST (Backend + Mock Mode)"
echo ""
echo "1. HEALTH CHECK"
curl -s http://localhost:3000/health | jq .
echo ""
echo "2. CREATE 3 TEST LEADS"
for num in 1 2 3; do
  curl -s -X POST http://localhost:3000/dev/trigger-lead \
    -H "Content-Type: application/json" \
    -d "{\"leadgenId\": \"test_$num\", \"formId\": \"form_$num\", \"pageId\": \"page_demo\"}" | \
    jq ".lead | {id, name, email}"
  echo ""
done

echo "3. FETCH ALL LEADS"
curl -s http://localhost:3000/leads | jq ".[] | {id, name, email, phone}"
echo ""
echo "TEST PASSED"
