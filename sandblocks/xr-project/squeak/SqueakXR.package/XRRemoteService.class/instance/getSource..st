requests
getSource: aWebRequest

	aWebRequest
		send200Response: self source asJsonString
		contentType: 'application/json'
		do: [:res | res headerAt: 'Access-Control-Allow-Origin' put: '*']