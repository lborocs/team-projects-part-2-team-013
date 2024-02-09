<?php
require_once("lib/response.php");
require_once("secrets.php");

require 'vendor/autoload.php';
use \Mailjet\Resources;
use \Mailjet\Client;

function send_email(
    string $recipient_addr,
    string $recipient_name,
    string $subject,
    string $body,
    string $from="noreply@013.team"
) {
    $mj = new \Mailjet\Client(MAILJET_API_KEY, MAILJET_API_SECRET, true, ['version' => 'v3.1']);

    $body = [
        'Messages' => [
            [
                'From' => [
                    'Email' => $from,
                    'Name' => "013.team - Make It All"
                ],
                'To' => [
                    [
                        'Email' => $recipient_addr,
                        'Name' => $recipient_name
                    ]
                ],
                'Subject' => $subject,
                'TextPart' => $body,
                'HTMLPart' => $body,
            ]
        ]
    ];

    $response = $mj->post(Resources::$Email, ['body' => $body]);

    if ($response->success()) {
        return true;
    } else {
        error_log("failed to send email: " . var_export($response->getData() , true));
        respond_infrastructure_error(
            "Failed to send email: " . $response->getReasonPhrase(),
            ERROR_MAILJET_FAILED_TO_SEND_EMAIL
        );
    };
}
?>